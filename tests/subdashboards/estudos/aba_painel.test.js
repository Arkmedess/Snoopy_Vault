const { test, describe } = require('node:test');
const assert = require('node:assert');
const { renderAbaPainel } = require('../../../99_Meta/Snoopy/subdashboards/estudos/abas/aba_painel.js');
const GraficosSVG = require('../../../99_Meta/Snoopy/subdashboards/estudos/graficos_svg.js');

/**
 * Simula fielmente o DataArray Proxy retornado pelo DataviewJS no Obsidian:
 * É um Proxy sobre um Array (portanto Array.isArray(proxy) === true!),
 * mas o trap `get` intercepta métodos não suportados (.reduce, .findIndex)
 * fazendo property-swizzling e retornando outro DataArray em vez de função.
 */
function createRealisticDataviewDataArray(items) {
  const arr = [...items];
  const methods = {
    where: (pred) => createRealisticDataviewDataArray(arr.filter(pred)),
    filter: (pred) => createRealisticDataviewDataArray(arr.filter(pred)),
    map: (fn) => createRealisticDataviewDataArray(arr.map(fn)),
    forEach: (fn) => arr.forEach(fn),
    find: (pred) => arr.find(pred),
    some: (pred) => arr.some(pred),
    every: (pred) => arr.every(pred),
    slice: (s, e) => createRealisticDataviewDataArray(arr.slice(s, e)),
    join: (sep) => arr.join(sep),
    array: () => [...arr]
  };
  return new Proxy(arr, {
    get(target, prop) {
      if (prop === 'length') return target.length;
      if (prop === 'values') return target;
      if (typeof prop === 'symbol') return target[prop] ? target[prop].bind(target) : undefined;
      if (/^\d+$/.test(String(prop))) return target[Number(prop)];
      if (Object.prototype.hasOwnProperty.call(methods, prop)) return methods[prop];
      // Swizzling do Dataview: qualquer outra propriedade (como .reduce ou .findIndex) retorna um DataArray mapeado, NÃO uma função!
      return createRealisticDataviewDataArray(target.map(x => (x ? x[prop] : undefined)));
    }
  });
}

// Mock simples de elemento DOM para teste em ambiente Node puro
function createMockEl(tag = 'div', attrs = {}) {
  const el = {
    tagName: tag,
    attrs: { ...attrs },
    style: {},
    innerHTML: '',
    children: [],
    createEl: (childTag, opts = {}) => {
      const child = createMockEl(childTag, opts.attr || {});
      if (opts.cls) child.className = opts.cls;
      if (opts.text) child.innerText = opts.text;
      el.children.push(child);
      return child;
    },
    querySelectorAll: () => [],
    querySelector: () => null
  };
  return el;
}

describe('Subdashboard Estudos - Aba Painel', () => {
  test('Exporta a função renderAbaPainel', () => {
    assert.strictEqual(typeof renderAbaPainel, 'function');
  });

  test('Renderiza os blocos principais sem erros em mock de DOM', () => {
    const root = createMockEl('div');
    const mockCtx = {
      app: { workspace: { openLinkText: () => {} } },
      estado: { disciplinaAtualIdx: 0, revisoes: [], historicoDiario: {} },
      disciplinas: [
        { nome: 'Física', area: 'Geral', minutos: 120, feitas: 20, acertos: 18, erros: 2, pct: 90, provas: [] }
      ],
      graficosSvg: {
        montarDonutCard: (c) => c.createEl('div'),
        montarLineChartCard: (c) => c.createEl('div')
      },
      modais: {
        abrirModalOrganizarCiclo: () => {},
        abrirModalSessao: () => {},
        abrirModalEditarMateria: () => {},
        abrirModalVincularPdf: () => {}
      },
      categoriaFiltroAtiva: 'Todas',
      salvarEstado: async () => {},
      onReload: () => {}
    };

    renderAbaPainel(root, mockCtx);
    assert.ok(root.children.length > 0);
  });

  test('Renderiza ícones SVG Lucide e não contém emojis de interface (⚙, ✓, 📄, →, ⋮)', () => {
    const root = createMockEl('div');
    const mockCtx = {
      app: { workspace: { openLinkText: () => {} } },
      estado: {
        disciplinaAtualIdx: 0,
        revisoes: [{ status: 'programada', proximaRevisao: '2026-01-01', nome: 'Algoritmos', intervaloDias: 1 }],
        historicoDiario: {}
      },
      disciplinas: [
        { nome: 'Física', area: 'Geral', minutos: 120, feitas: 20, acertos: 18, erros: 2, pct: 90, provas: ['[[PDFs/Prova1.pdf]]'] }
      ],
      graficosSvg: {
        montarDonutCard: (c) => c.createEl('div'),
        montarLineChartCard: (c) => c.createEl('div')
      },
      modais: {
        abrirModalOrganizarCiclo: () => {},
        abrirModalSessao: () => {},
        abrirModalEditarMateria: () => {},
        abrirModalVincularPdf: () => {},
        abrirModalNovaMateria: () => {}
      },
      categoriaFiltroAtiva: 'Todas',
      salvarEstado: async () => {},
      onReload: () => {}
    };

    renderAbaPainel(root, mockCtx);

    function checkNoObservedEmojis(el) {
      const html = el.innerHTML || '';
      const text = el.innerText || '';
      const prohibited = ['⚙', '✓', '📄', '→', '⋮'];
      for (const p of prohibited) {
        assert.ok(!html.includes(p) && !text.includes(p), `Interface não deve conter o caractere obsoleto "${p}"`);
      }
      for (const child of el.children) {
        checkNoObservedEmojis(child);
      }
    }

    checkNoObservedEmojis(root);
  });

  test('Renderiza ação de agendar tarefa vinculada na tabela de matérias', () => {
    const root = createMockEl('div');
    let tarefaModalAberta = false;

    const mockCtx = {
      app: { workspace: { openLinkText: () => {} } },
      estado: { disciplinaAtualIdx: 0, revisoes: [], historicoDiario: {} },
      disciplinas: [
        { nome: 'Física', area: 'Geral', minutos: 120, feitas: 20, acertos: 18, erros: 2, pct: 90, provas: [] }
      ],
      graficosSvg: {
        montarDonutCard: (c) => c.createEl('div'),
        montarLineChartCard: (c) => c.createEl('div')
      },
      modais: {
        abrirModalCriarTarefaMateria: (disc) => {
          assert.strictEqual(disc.nome, 'Física');
          tarefaModalAberta = true;
        }
      },
      categoriaFiltroAtiva: 'Todas',
      salvarEstado: async () => {},
      onReload: () => {}
    };

    renderAbaPainel(root, mockCtx);

    function findText(el, text) {
      if (el.innerText && el.innerText.includes(text)) return true;
      if (el.innerHTML && el.innerHTML.includes(text)) return true;
      return el.children.some(c => findText(c, text));
    }

    assert.ok(findText(root, 'Tarefa'), 'Deve conter botão de ação Tarefa na tabela');
  });

  test('Exibe barra de cadastro rápido inline (Quick-Add) na tabela e filtra áreas sem poluição de categorias vazias', () => {
    const root = createMockEl('div');
    const mockCtx = {
      app: { vault: {}, workspace: { openLinkText: () => {} } },
      estado: {
        disciplinaAtualIdx: 0,
        metaHorasSemanal: 20,
        metaQuestoesSemanal: 100,
        revisoes: [{ status: 'programada', proximaRevisao: '2026-10-25', nome: 'Arquitetura de Software', intervaloDias: 7 }],
        historicoDiario: {}
      },
      disciplinas: [
        { nome: 'Arquitetura de Software', area: 'Programação', minutos: 0, feitas: 10, acertos: 8, erros: 2, pct: 80, provas: [] }
      ],
      graficosSvg: {
        montarDonutCard: (c) => c.createEl('div'),
        montarLineChartCard: (c) => c.createEl('div')
      },
      modais: {
        abrirModalCriarTarefaMateria: () => {},
        abrirModalNovaMateria: () => {}
      },
      categoriaFiltroAtiva: 'Todas',
      salvarEstado: async () => {},
      onReload: () => {}
    };

    renderAbaPainel(root, mockCtx);

    function findHtml(el, snippet) {
      if (el.innerHTML && el.innerHTML.includes(snippet)) return true;
      return el.children.some(c => findHtml(c, snippet));
    }

    assert.ok(findHtml(root, 'quick-add-mat-nome'), 'Tabela deve possuir input de cadastro rápido inline');
    assert.ok(findHtml(root, 'quick-add-mat-task'), 'Tabela deve possuir checkbox para vincular à tabela de tarefas da Home');
    assert.ok(!findHtml(root, 'ENEM</span><span class="snoopy-micro" style="opacity: 0.75;">(0)'), 'Não deve poluir filtros com áreas vazias (0) quando já existem matérias em áreas específicas');
  });

  test('Renderiza painel completo (Donut, Gráfico 7D, KPIs, Radar e Tabela) quando disciplinas vêm como DataArray do DataviewJS (sem .reduce/.findIndex)', () => {
    const root = createMockEl('div');
    const dataArrayDisciplinas = createRealisticDataviewDataArray([
      {
        nome: 'Arquitetura de Software',
        path: '03_Estudos/Exemplo - Arquitetura de Software.md',
        area: 'Programação',
        categoria: 'Programação',
        minutos: 0,
        feitas: 10,
        acertos: 8,
        erros: 2,
        pct: 80,
        provas: []
      }
    ]);

    const mockCtx = {
      app: { vault: {}, workspace: { openLinkText: () => {} } },
      estado: {
        disciplinaAtualIdx: 0,
        cicloOrdem: ['03_Estudos/Exemplo - Arquitetura de Software.md'],
        metaHorasSemanal: 20,
        metaQuestoesSemanal: 150,
        revisoes: [
          {
            materiaPath: '03_Estudos/Exemplo - Arquitetura de Software.md',
            nome: 'Exemplo - Arquitetura de Software',
            proximaRevisao: '2026-10-05',
            intervaloDias: 1,
            status: 'programada'
          }
        ],
        historicoDiario: {
          '2026-10-25': { minutosFoco: 100, questoesFeitas: 0, questoesAcertos: 0 }
        }
      },
      disciplinas: dataArrayDisciplinas,
      graficosSvg: GraficosSVG,
      modais: {
        abrirModalCriarTarefaMateria: () => {},
        abrirModalNovaMateria: () => {},
        abrirModalOrganizarCiclo: () => {},
        abrirModalSessao: () => {},
        abrirModalEditarMateria: () => {},
        abrirModalVincularPdf: () => {}
      },
      categoriaFiltroAtiva: 'Todas',
      salvarEstado: async () => {},
      onReload: () => {}
    };

    renderAbaPainel(root, mockCtx);

    function collectAllHtml(el) {
      let out = (el.innerHTML || '') + ' ' + (el.innerText || '');
      for (const c of el.children) {
        out += ' ' + collectAllHtml(c);
      }
      return out;
    }

    const fullHtml = collectAllHtml(root);
    assert.ok(fullHtml.includes('<svg width="130" height="130"'), 'Donut SVG deve ser renderizado por completo');
    assert.ok(fullHtml.includes('FREQUÊNCIA & CONSTÂNCIA SEMANAL') || fullHtml.includes('ATIVIDADE'), 'Gráfico de barras de constância semanal deve ser renderizado');
    assert.ok(fullHtml.includes('TEMPO DE FOCO & META 7D'), 'KPIs consolidados devem ser renderizados');
    assert.ok(fullHtml.includes('CICLO ATIVO'), 'Radar do ciclo deve ser renderizado');
    assert.ok(fullHtml.includes('TABELA DE MATÉRIAS & SIMULADOS'), 'Tabela de matérias deve ser renderizada');
    assert.ok(fullHtml.includes('Rev: Hoje'), 'Revisão pendente vinculada pelo materiaPath deve exibir badge Rev: Hoje');
  });

  test('Exibe Central de Provas com Cronômetro Contínuo de Simulação Real e cadastro de questões, acertos, erros e tempo', () => {
    const root = createMockEl('div');
    const mockCtx = {
      app: { vault: {}, workspace: { openLinkText: () => {} } },
      estado: {
        disciplinaAtualIdx: 0,
        simulados: [
          {
            id: 'sim-1',
            data: '2026-10-25',
            titulo: 'Simulado Arquitetura AWS',
            materia: 'Arquitetura de Software',
            area: 'Programação',
            questoes: 65,
            acertos: 52,
            erros: 13,
            tempoMin: 130,
            pct: 80
          }
        ],
        revisoes: [],
        historicoDiario: {}
      },
      disciplinas: [
        { nome: 'Arquitetura de Software', area: 'Programação', minutos: 130, feitas: 65, acertos: 52, erros: 13, pct: 80, provas: [] }
      ],
      graficosSvg: GraficosSVG,
      modais: {},
      categoriaFiltroAtiva: 'Todas',
      salvarEstado: async () => {},
      onReload: () => {}
    };

    renderAbaPainel(root, mockCtx);

    function collectAllHtml(el) {
      let out = (el.innerHTML || '') + ' ' + (el.innerText || '');
      for (const c of el.children) out += ' ' + collectAllHtml(c);
      return out;
    }

    const html = collectAllHtml(root);
    assert.ok(html.includes('btn-prova-timer-toggle'), 'Deve possuir cronômetro contínuo para simulação real de prova');
    assert.ok(html.includes('quick-prova-questoes'), 'Deve possuir campo de quantidade de questões da prova');
    assert.ok(html.includes('quick-prova-acertos'), 'Deve possuir campo de acertos da prova');
    assert.ok(html.includes('quick-prova-erros'), 'Deve possuir campo de erros da prova');
    assert.ok(html.includes('quick-prova-tempo'), 'Deve possuir campo de tempo para fazer a prova');
    assert.ok(html.includes('Simulado Arquitetura AWS'), 'Deve listar provas cadastradas com placar de questões, acertos, erros e tempo');
  });

  test('Garante pluralização limpa de revisões e feedback humanizado sem strings genéricas (1 pendente(s))', () => {
    const root = createMockEl('div');
    const mockCtx = {
      app: { vault: {}, workspace: { openLinkText: () => {} } },
      estado: {
        disciplinaAtualIdx: 0,
        revisoes: [
          { status: 'programada', proximaRevisao: '2026-01-01', nome: 'Algoritmos', intervaloDias: 1 }
        ],
        historicoDiario: {}
      },
      disciplinas: [
        { nome: 'Algoritmos', area: 'Geral', minutos: 60, feitas: 10, acertos: 9, erros: 1, pct: 90, provas: [] }
      ],
      graficosSvg: GraficosSVG,
      modais: {},
      categoriaFiltroAtiva: 'Todas',
      salvarEstado: async () => {},
      onReload: () => {}
    };

    renderAbaPainel(root, mockCtx);

    function collectAllHtml(el) {
      let out = (el.innerHTML || '') + ' ' + (el.innerText || '');
      for (const c of el.children) out += ' ' + collectAllHtml(c);
      return out;
    }

    const html = collectAllHtml(root);
    assert.ok(!html.includes('pendente(s)'), 'Não deve exibir string feia "pendente(s)" com parênteses');
    assert.ok(html.includes('1 pendente'), 'Deve pluralizar corretamente para "1 pendente" no singular');
    assert.ok(!html.includes('1 rev(s)'), 'Não deve exibir "1 rev(s)" com parênteses nos KPIs');
    assert.ok(html.includes('1 revisão') || html.includes('1 pendente'), 'Deve exibir texto humanizado para o usuário');
  });

  test('Harmoniza o Painel com foco no Planner (Cronograma de Hoje & Matéria da Vez integrada)', () => {
    const root = createMockEl('div');
    const mockCtx = {
      app: { vault: {}, workspace: { openLinkText: () => {} } },
      estado: {
        disciplinaAtualIdx: 0,
        planner: {
          '2026-10-26': [
            { materia: 'Arquitetura de Software', tipo: 'TEORIA', duracaoMin: 60, concluido: true }
          ]
        },
        revisoes: [
          { status: 'programada', proximaRevisao: '2026-10-26', nome: 'Design Patterns', intervaloDias: 1 }
        ],
        historicoDiario: {
          '2026-10-26': { minutosFoco: 60, questoesFeitas: 10, questoesAcertos: 9 }
        }
      },
      disciplinas: [
        { nome: 'Arquitetura de Software', area: 'Programação', minutos: 60, feitas: 10, acertos: 9, erros: 1, pct: 90, provas: [] }
      ],
      graficosSvg: GraficosSVG,
      modais: {},
      categoriaFiltroAtiva: 'Todas',
      salvarEstado: async () => {},
      onReload: () => {}
    };

    renderAbaPainel(root, mockCtx);

    function collectAllHtml(el) {
      let out = (el.innerHTML || '') + ' ' + (el.innerText || '');
      for (const c of el.children) out += ' ' + collectAllHtml(c);
      return out;
    }

    const html = collectAllHtml(root);
    assert.ok(html.includes('PLANEJAMENTO DO DIA') || html.includes('CRONOGRAMA DE HOJE'), 'Deve conter seção de Planejamento do Dia com foco no Planner');
    assert.ok(html.includes('Arquitetura de Software'), 'Deve listar a matéria planejada para hoje');
    assert.ok(html.includes('TEORIA') || html.includes('Teoria'), 'Deve indicar o tipo de estudo do bloco planejado');
  });

  test('Tabela de matérias não deve conter o botão ou texto "Vincular PDF"', () => {
    const root = createMockEl('div');
    const mockCtx = {
      app: { workspace: { openLinkText: () => {} } },
      estado: {
        disciplinaAtualIdx: 0,
        revisoes: [],
        historicoDiario: {}
      },
      disciplinas: [
        { nome: 'Arquitetura de Software', area: 'Programação', minutos: 60, feitas: 10, acertos: 8, erros: 2, pct: 80, provas: [] }
      ],
      graficosSvg: GraficosSVG,
      modais: {},
      categoriaFiltroAtiva: 'Todas',
      salvarEstado: async () => {},
      onReload: () => {}
    };

    renderAbaPainel(root, mockCtx);

    function collectAllHtml(el) {
      let out = (el.innerHTML || '') + ' ' + (el.innerText || '');
      for (const c of el.children) out += ' ' + collectAllHtml(c);
      return out;
    }

    const html = collectAllHtml(root);
    assert.ok(!html.includes('Vincular PDF'), 'Não deve exibir o texto "Vincular PDF"');
    assert.ok(!html.includes('btn-add-pdf'), 'Não deve conter o seletor .btn-add-pdf');
    assert.ok(!html.includes('Disciplina & Materiais'), 'Cabeçalho deve ser simplificado para "Disciplina"');
    assert.ok(html.includes('Arquitetura de Software'), 'Deve exibir o nome da disciplina');
  });

  test('Gráfico de barras exibe tooltip com tempo e matéria no hover, e gráfico de linhas foi removido', () => {
    const root = createMockEl('div');
    const mockCtx = {
      app: { workspace: { openLinkText: () => {} } },
      estado: {
        disciplinaAtualIdx: 0,
        revisoes: [],
        historicoDiario: {
          '2026-10-25': { minutos: 90, questoes: 10, materias: ['Arquitetura de Software'] }
        }
      },
      disciplinas: [
        { nome: 'Arquitetura de Software', area: 'Programação', minutos: 90, feitas: 10, acertos: 8, erros: 2, pct: 80, provas: [] },
        { nome: 'Banco de Dados', area: 'Dados', minutos: 0, feitas: 0, acertos: 0, erros: 0, pct: 0, provas: [] }
      ],
      graficosSvg: GraficosSVG,
      modais: {},
      categoriaFiltroAtiva: 'Todas',
      salvarEstado: async () => {},
      onReload: () => {}
    };

    renderAbaPainel(root, mockCtx);

    function collectAllHtml(el) {
      let out = (el.innerHTML || '') + ' ' + (el.innerText || '');
      for (const c of el.children) out += ' ' + collectAllHtml(c);
      return out;
    }

    const html = collectAllHtml(root);
    // Não deve conter o antigo gráfico de linhas
    assert.ok(!html.includes('TEMPO DE ESTUDO & FOCO (7 DIAS)'), 'Gráfico de linhas deve ter sido removido');
    // Deve conter o gráfico de barras de atividade semanal
    assert.ok(html.includes('FREQUÊNCIA & CONSTÂNCIA SEMANAL'), 'Deve conter o gráfico de barras de atividade semanal');
    // Deve conter tooltip com horário e matéria
    assert.ok(html.includes('snoopy-bar-tooltip'), 'Deve conter elemento de tooltip flutuante nos itens de barra');
    // Deve conter os novos cards de aproveitamento do espaço na coluna esquerda
    assert.ok(html.includes('PRÓXIMAS DO CICLO') || html.includes('FLUXO CONTÍNUO'), 'Deve aproveitar o espaço esquerdo com próximas matérias do ciclo');
    assert.ok(html.includes('RITMO & METAS SEMANAIS') || html.includes('HORAS DE FOCO'), 'Deve aproveitar o espaço com ritmo e metas');
  });
});


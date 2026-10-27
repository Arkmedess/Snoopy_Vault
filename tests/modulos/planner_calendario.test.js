/**
 * Snoopy Vault - Testes Unitários do Módulo 03: Planner & Calendário Mensal
 * Executado nativamente via `node --test`.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createMockEl, carregarModulo, createMockDataview } = require('../helpers/test_utils.js');
const UIKit = require('../../99_Meta/Snoopy/core/ui_kit.js');

describe('Módulo 03 - Planner & Calendário Mensal (03_snoopy_planner_calendario)', () => {
  const moduloPlanner = carregarModulo('99_Meta/Snoopy/modulos/03_snoopy_planner_calendario.js');

  test('Exporta identificador e método render', () => {
    assert.strictEqual(moduloPlanner.id, 'snoopy_planner_calendario');
    assert.strictEqual(moduloPlanner.titulo, 'Planner & Calendário Mensal');
    assert.strictEqual(typeof moduloPlanner.render, 'function');
  });

  test('Renderiza grade mensal, barra de agendamento e próximos blocos no espaço do módulo', async () => {
    const root = createMockEl('div');

    const mockTasks = [
      { text: '- [ ] Tarefa teste 📅 2026-10-26', completed: false, file: { path: '01_Inbox/Diário/2026-10-26.md' } }
    ];

    const mockPages = [
      { file: { name: 'Direito Penal', path: '03_Estudos/Direito Penal.md' }, disciplina: 'Direito' }
    ];

    const mockDv = createMockDataview(mockPages);
    mockDv.pages = (folder) => {
      if (folder && folder.includes('03_Estudos')) {
        return {
          where: () => mockPages,
          sort: () => mockPages,
          [Symbol.iterator]: function* () { yield* mockPages; }
        };
      }
      return {
        where: () => ({
          file: {
            tasks: {
              where: () => mockTasks
            }
          }
        })
      };
    };

    const mockCicloData = {
      disciplinaAtualIdx: 0,
      cicloOrdem: ['Direito Penal'],
      historicoDiario: {
        '2026-10-26': { minutosFoco: 50, questoesFeitas: 10 }
      },
      revisoes: [
        { nome: 'Direito Penal', proximaRevisao: '2026-10-26', status: 'programada', intervaloDias: 1 }
      ],
      planner: {
        '2026-10-26': [{ materia: 'Direito Penal', tempo: '1h', tipo: 'Teoria' }]
      }
    };

    const mockApp = {
      vault: {
        getAbstractFileByPath: (p) => {
          if (p === '99_Meta/ciclo-estudos.json') return { path: p };
          return null;
        },
        read: async (file) => {
          if (file.path === '99_Meta/ciclo-estudos.json') return JSON.stringify(mockCicloData);
          return '';
        },
        modify: async () => {},
        create: async () => ({})
      },
      workspace: {
        openLinkText: () => {}
      }
    };

    const mockCtx = {
      root,
      app: mockApp,
      dv: mockDv,
      todayStr: '2026-10-26',
      UIKit,
      renderIcon: (el, name, opts) => UIKit.renderIcon(el, name, opts)
    };

    await moduloPlanner.render(mockCtx);

    const plannerSection = root.querySelector('.snoopy-planner-section');
    assert.ok(plannerSection, 'Container snoopy-planner-section deve existir');

    function collectText(el) {
      let txt = (el.innerText || '') + ' ' + (el.innerHTML || '');
      for (const c of el.children) txt += ' ' + collectText(c);
      return txt;
    }

    const fullText = collectText(plannerSection);
    assert.ok(fullText.includes('PLANNER') || fullText.includes('CALENDÁRIO'), 'Deve conter cabeçalho do Planner');
    assert.ok(fullText.includes('Agendar') || fullText.includes('AGENDAR'), 'Deve conter ação de agendamento');
    assert.ok(fullText.includes('PRÓXIMOS') || fullText.includes('Próximos'), 'Deve conter painel de próximos blocos');
    assert.ok(fullText.includes('Direito Penal'), 'Deve renderizar matéria agendada no planner');
  });

  test('Filtra tarefas via barramento de eventos (tarefas:filtrar-data) ao clicar no dia e exibe flags', async () => {
    const root = createMockEl('div');

    const mockTasks = [
      { text: '- [ ] Estudar Algoritmos 📅 2026-10-26', completed: false, file: { path: '01_Inbox/Diário/2026-10-26.md' } },
      { text: '- [ ] Revisão Constitucional 📅 2026-10-25', completed: false, file: { path: '01_Inbox/Diário/2026-10-25.md' } }
    ];

    const mockPages = [
      { file: { name: 'Algoritmos', path: '03_Estudos/Algoritmos.md' }, disciplina: 'TI' }
    ];

    const mockDv = createMockDataview(mockPages);
    mockDv.pages = (folder) => {
      if (folder && folder.includes('03_Estudos')) {
        return {
          where: () => mockPages,
          sort: () => mockPages,
          [Symbol.iterator]: function* () { yield* mockPages; }
        };
      }
      return {
        where: () => ({
          file: {
            tasks: {
              where: () => mockTasks
            }
          }
        })
      };
    };

    let eventoDisparado = null;
    let payloadDisparado = null;

    const mockEvents = {
      emit: (evt, payload) => {
        eventoDisparado = evt;
        payloadDisparado = payload;
      }
    };

    const mockCicloData = {
      disciplinaAtualIdx: 0,
      cicloOrdem: ['Algoritmos'],
      historicoDiario: {
        '2026-10-26': { minutosFoco: 25, questoesFeitas: 5 }
      },
      revisoes: [
        { nome: 'Algoritmos', proximaRevisao: '2026-10-26', status: 'programada', intervaloDias: 1 }
      ],
      planner: {
        '2026-10-26': [{ materia: 'Algoritmos', tempo: '1h', tipo: 'Teoria' }]
      }
    };

    const mockApp = {
      vault: {
        getAbstractFileByPath: (p) => {
          if (p === '99_Meta/ciclo-estudos.json') return { path: p };
          return null;
        },
        read: async () => JSON.stringify(mockCicloData),
        modify: async () => {},
        create: async () => ({})
      },
      workspace: { openLinkText: () => {} }
    };

    const mockCtx = {
      root,
      app: mockApp,
      dv: mockDv,
      todayStr: '2026-10-26',
      events: mockEvents,
      UIKit,
      renderIcon: (el, name, opts) => UIKit.renderIcon(el, name, opts)
    };

    await moduloPlanner.render(mockCtx);

    const plannerSection = root.querySelector('.snoopy-planner-section');
    assert.ok(plannerSection);

    // Verifica que o título não é um link que joga para subdashboard
    const linkSub = plannerSection.querySelector('#link-subdashboard-planner');
    assert.strictEqual(linkSub, null, 'Título do Planner não deve conter link para abrir o subdashboard de estudos');

    // Encontra as células do calendário
    const findCells = (el, acc = []) => {
      if (el.onclick && el.className && el.className.includes && !el.tagName.includes('BUTTON')) {
        acc.push(el);
      }
      for (const c of el.children) findCells(c, acc);
      return acc;
    };

    const cells = findCells(plannerSection);
    assert.ok(cells.length > 0, 'Deve renderizar células clicáveis no calendário');

    // Clica na primeira célula com evento de clique
    const cellDia = cells[0];
    cellDia.onclick();

    assert.strictEqual(eventoDisparado, 'tarefas:filtrar-data', 'Deve emitir evento tarefas:filtrar-data ao clicar no dia');
    assert.ok(payloadDisparado && payloadDisparado.data, 'Payload do evento deve conter data selecionada');
  });

  test('Renderiza detalhes ricos de Tarefa, Estudo, Revisão e Leitura no painel lateral de PRÓXIMOS BLOCOS', async () => {
    const root = createMockEl('div');

    const mockTasks = [
      { text: '- [ ] Resolver 20 questões de Redes 📅 2026-10-26 #tarefa', completed: false, file: { path: '01_Inbox/Diário/2026-10-26.md', name: '2026-10-26' } },
      { text: '- [ ] Enviar relatório atrasado 📅 2026-10-20 #tarefa', completed: false, file: { path: '02_Projetos/Relatorio.md', name: 'Relatorio' } }
    ];

    const mockPagesEstudos = [
      { file: { name: 'Engenharia de Software', path: '03_Estudos/Engenharia de Software.md' }, disciplina: 'TI' }
    ];

    const mockLivros = [
      {
        title: 'Código Limpo',
        author: 'Robert C. Martin',
        current_page: 120,
        total_pages: 400,
        status: 'Lendo',
        file: { name: 'Código Limpo', path: '04_Leituras/Livros/Código Limpo.md' }
      }
    ];

    const mockDv = {
      pages: (folder) => {
        if (folder && folder.includes('01_Inbox')) {
          return {
            where: () => ({
              file: {
                tasks: {
                  where: () => mockTasks
                }
              }
            })
          };
        }
        if (folder && folder.includes('04_Leituras/Livros')) {
          return {
            where: () => mockLivros,
            [Symbol.iterator]: function* () { yield* mockLivros; }
          };
        }
        if (folder && folder.includes('03_Estudos')) {
          return {
            where: () => mockPagesEstudos,
            sort: () => mockPagesEstudos,
            [Symbol.iterator]: function* () { yield* mockPagesEstudos; }
          };
        }
        return [];
      }
    };

    const mockCicloData = {
      disciplinaAtualIdx: 0,
      cicloOrdem: ['Engenharia de Software'],
      historicoDiario: {
        '2026-10-26': { minutosFoco: 60, questoesFeitas: 15 }
      },
      revisoes: [
        { nome: 'Engenharia de Software', proximaRevisao: '2026-10-26', status: 'programada', intervaloDias: 7 }
      ],
      planner: {
        '2026-10-26': [{ materia: 'Engenharia de Software', tempo: '1h45m', tipo: 'Teoria + Questões' }]
      }
    };

    const arquivosModificados = {};

    const mockApp = {
      vault: {
        getAbstractFileByPath: (p) => {
          if (p === '99_Meta/ciclo-estudos.json') return { path: p };
          if (p === '01_Inbox/Diário/2026-10-26.md') return { path: p };
          if (p === '04_Leituras/Livros/Código Limpo.md') return { path: p };
          return null;
        },
        read: async (f) => {
          if (f.path === '99_Meta/ciclo-estudos.json') return JSON.stringify(mockCicloData);
          if (f.path === '01_Inbox/Diário/2026-10-26.md') return '## Tarefas\n- [ ] Resolver 20 questões de Redes 📅 2026-10-26 #tarefa\n';
          if (f.path === '04_Leituras/Livros/Código Limpo.md') return '---\ncurrent_page: 120\ntotal_pages: 400\nstatus: "Lendo"\n---\n';
          return '';
        },
        modify: async (f, content) => {
          arquivosModificados[f.path] = content;
        },
        create: async () => ({})
      },
      workspace: { openLinkText: () => {} }
    };

    const mockCtx = {
      root,
      app: mockApp,
      dv: mockDv,
      todayStr: '2026-10-26',
      UIKit,
      renderIcon: (el, name, opts) => UIKit.renderIcon(el, name, opts)
    };

    await moduloPlanner.render(mockCtx);

    const plannerSection = root.querySelector('.snoopy-planner-section');
    assert.ok(plannerSection);

    // Coleta todos os cards de atividade renderizados no painel lateral
    const activityCards = [];
    const collectCards = (el) => {
      if (el.classList && el.classList.contains('snoopy-activity-card')) {
        activityCards.push(el);
      }
      for (const c of el.children) collectCards(c);
    };
    collectCards(plannerSection);

    assert.ok(activityCards.length >= 4, `Deve renderizar pelo menos 4 atividades no painel lateral (encontradas: ${activityCards.length})`);

    function cardHasText(card, str) {
      const txt = (card.innerText || '') + ' ' + (card.innerHTML || '');
      return txt.includes(str);
    }

    // 1. Valida presença e detalhes da Tarefa
    const cardTarefa = activityCards.find(c => cardHasText(c, 'TAREFA') && cardHasText(c, 'Resolver 20 questões'));
    assert.ok(cardTarefa, 'Deve renderizar card detalhado da Tarefa pendente');
    assert.ok(cardHasText(cardTarefa, 'Foco'), 'Card de Tarefa deve possuir ação de Foco no Pomodoro');
    const chk = cardTarefa.querySelector('.chk-task-toggle');
    assert.ok(chk, 'Card de Tarefa deve possuir checkbox para conclusão');

    // 2. Valida presença da Tarefa Atrasada
    const cardAtrasada = activityCards.find(c => cardHasText(c, 'ATRASADA') && cardHasText(c, 'Enviar relatório'));
    assert.ok(cardAtrasada, 'Deve sinalizar tarefa atrasada com badge e destaque');

    // 3. Valida presença e detalhes do Estudo Agendado
    const cardEstudo = activityCards.find(c => cardHasText(c, 'ESTUDO') && cardHasText(c, 'Engenharia de Software'));
    assert.ok(cardEstudo, 'Deve renderizar card detalhado do Estudo Agendado');
    assert.ok(cardHasText(cardEstudo, '1h45m'), 'Card de Estudo deve exibir duração estimada');
    assert.ok(cardHasText(cardEstudo, 'Teoria + Questões'), 'Card de Estudo deve exibir modalidade');

    // 4. Valida presença e detalhes da Revisão Espaçada
    const cardRevisao = activityCards.find(c => cardHasText(c, 'REVISÃO') && cardHasText(c, 'Engenharia de Software'));
    assert.ok(cardRevisao, 'Deve renderizar card detalhado da Revisão Espaçada');
    assert.ok(cardHasText(cardRevisao, 'D+7'), 'Card de Revisão deve exibir intervalo de retenção');

    // 5. Valida presença e detalhes da Leitura Ativa
    const cardLeitura = activityCards.find(c => cardHasText(c, 'LEITURA') && cardHasText(c, 'Código Limpo'));
    assert.ok(cardLeitura, 'Deve renderizar card detalhado da Leitura Ativa');
    assert.ok(cardHasText(cardLeitura, '120/400'), 'Card de Leitura deve exibir páginas lidas/totais');
    assert.ok(cardHasText(cardLeitura, '+5p') && cardHasText(cardLeitura, '+10p'), 'Card de Leitura deve possuir botões de incremento de páginas');

    // 6. Testa interação: clica em +5p no card de Leitura
    const btnP5 = cardLeitura.querySelector('.btn-pag-5');
    assert.ok(btnP5, 'Botão de +5 páginas deve existir no card de leitura');
    await btnP5.onclick(new Event('click'));
    assert.ok(arquivosModificados['04_Leituras/Livros/Código Limpo.md'], 'Deve atualizar arquivo markdown do livro');
    assert.ok(arquivosModificados['04_Leituras/Livros/Código Limpo.md'].includes('current_page: 125'), 'Deve incrementar página de 120 para 125');
  });

  test('Garante que as células do calendário possuem classe snoopy-planner-day e altura mínima suficiente', async () => {
    const root = createMockEl('div');

    const mockCtx = {
      root,
      app: { vault: { getAbstractFileByPath: () => null } },
      dv: { pages: () => [] },
      todayStr: '2026-10-26',
      UIKit,
      renderIcon: (el, name, opts) => UIKit.renderIcon(el, name, opts)
    };

    await moduloPlanner.render(mockCtx);

    const plannerDays = root.querySelectorAll('.snoopy-planner-day');
    assert.ok(plannerDays.length >= 28, `Deve renderizar pelo menos 28 células de dia com a classe snoopy-planner-day (encontradas: ${plannerDays.length})`);

    const firstCell = plannerDays[0];
    const styleAttr = firstCell.getAttribute('style') || '';
    assert.ok(styleAttr.includes('min-height: 84px') || styleAttr.includes('min-height: 80px') || styleAttr.includes('height: auto'), 'Célula do calendário deve garantir altura mínima e responsiva');
  });
});

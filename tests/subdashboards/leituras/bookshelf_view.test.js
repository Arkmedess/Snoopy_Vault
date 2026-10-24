const { test, describe } = require('node:test');
const assert = require('node:assert');
const BookshelfView = require('../../../99_Meta/Snoopy/subdashboards/leituras/bookshelf_view.js');

function createMockEl(tag = 'div', attrs = {}) {
  let _innerHTML = '';
  const el = {
    tagName: tag,
    attrs: { ...attrs },
    style: {},
    children: [],
    get innerText() {
      return _innerHTML;
    },
    set innerText(val) {
      _innerHTML = val;
    },
    get innerHTML() {
      const clsPart = el.className ? `[class:${el.className}]` : '';
      return _innerHTML + clsPart + el.children.map(c => c.innerHTML).join('');
    },
    set innerHTML(val) {
      _innerHTML = val;
    },
    createEl: (childTag, opts = {}) => {
      const child = createMockEl(childTag, opts.attr || {});
      if (opts.cls) child.className = opts.cls;
      if (opts.text) {
        child.innerText = opts.text;
        child.innerHTML = opts.text;
      }
      el.children.push(child);
      return child;
    },
    appendChild: (child) => {
      el.children.push(child);
      return child;
    },
    querySelectorAll: () => [],
    querySelector: () => null
  };
  return el;
}

global.document = {
  createElement: (tag) => createMockEl(tag)
};

describe('Subdashboard Leituras - BookshelfView', () => {
  test('Exporta os métodos visuais do Bookshelf', () => {
    assert.strictEqual(typeof BookshelfView.criarCapaTipografica, 'function');
    assert.strictEqual(typeof BookshelfView.renderReadingKpis, 'function');
    assert.strictEqual(typeof BookshelfView.renderShelfGrid, 'function');
    assert.strictEqual(typeof BookshelfView.renderReaderCompanion, 'function');
  });

  test('Cria capa tipográfica de fallback com informações do livro', () => {
    const livro = { title: 'Clean Code', author: 'Robert C. Martin' };
    const el = BookshelfView.criarCapaTipografica(livro);
    assert.ok(el);
    assert.match(el.innerHTML, /Clean Code/);
    assert.match(el.innerHTML, /Robert C\. Martin/);
  });

  test('Renderiza faixa de KPIs com métricas consolidadas e ícones', () => {
    const rootKpis = createMockEl('div');
    const livros = [
      { title: 'Livro 1', status: 'Lendo', current_page: 80, total_pages: 200, rating: 5 },
      { title: 'Livro 2', status: 'Lido', current_page: 300, total_pages: 300, rating: 4, finished: '2026-03-01' },
      { title: 'Livro 3', status: 'Quero ler', current_page: 0, total_pages: 250, rating: 0 }
    ];
    const ctx = {
      renderIcon: (el, name) => el.createEl('span', { text: `[icon:${name}]` })
    };

    BookshelfView.renderReadingKpis(rootKpis, livros, ctx);
    assert.ok(rootKpis.children.length > 0);
    assert.match(rootKpis.innerHTML, /Acervo/);
    assert.match(rootKpis.innerHTML, /3/); // 3 livros
    assert.match(rootKpis.innerHTML, /380/); // 80 + 300 págs
    assert.match(rootKpis.innerHTML, /\[icon:book\]/);
  });

  test('Renderiza Reader Companion completo com stepper, rating e anotações', async () => {
    const rootCompanion = createMockEl('div');
    const livro = {
      title: 'Hábitos Atômicos',
      author: 'James Clear',
      current_page: 85,
      total_pages: 320,
      status: 'Lendo',
      rating: 5,
      description: 'Mudanças minúsculas, resultados extraordinários.',
      file: { path: '04_Leituras/Livros/Habitos.md', name: 'Habitos' }
    };

    const ctx = {
      app: {
        workspace: { openLinkText: () => {} },
        vault: {
          getAbstractFileByPath: () => ({ path: livro.file.path }),
          read: async () => `## 💡 Principais Lições & Citações\n- "Lição 1" (p. 20)\n\n## 🔗 Estudos & Disciplinas Vinculadas\n- [[Arquitetura de Software]]`
        }
      },
      modais: {
        incrementarPaginas: () => {},
        atualizarRating: () => {},
        abrirModalProgresso: () => {},
        abrirModalNovaAnotacao: () => {},
        abrirModalVincularEstudo: () => {},
        removerAnotacao: (livroAlvo, texto) => {
          anotacaoRemovida = { livroAlvo, texto };
        }
      },
      materiasEstudo: [{ title: 'Arquitetura de Software', file: { path: '03_Estudos/Arq.md', name: 'Arq' } }]
    };

    let anotacaoRemovida = null;
    await BookshelfView.renderReaderCompanion(rootCompanion, livro, ctx);
    assert.ok(rootCompanion.children.length > 0);
    assert.match(rootCompanion.innerHTML, /Hábitos Atômicos/);
    assert.match(rootCompanion.innerHTML, /James Clear/);
    assert.match(rootCompanion.innerHTML, /\+5/);
    assert.match(rootCompanion.innerHTML, /\+10/);
    assert.match(rootCompanion.innerHTML, /Lição 1/);
    assert.match(rootCompanion.innerHTML, /Arquitetura de Software/);
    assert.match(rootCompanion.innerHTML, /OFENSIVA:/);
    assert.match(rootCompanion.innerHTML, /Meta Diária:/);
    assert.match(rootCompanion.innerHTML, /✕/); // Botão natural para exclusão de citação/estudo/gênero
    assert.match(rootCompanion.innerHTML, /\+ Tema/); // Botão explícito para adicionar gênero abaixo do título
    // Garante que nenhum emoji está presente no HTML
    assert.doesNotMatch(rootCompanion.innerHTML, /[\u{1F300}-\u{1FAFF}]/u);
    assert.doesNotMatch(rootCompanion.innerHTML, /[📖✏🗑⚡💡🧠🔗🔖🏷]/);
  });

  test('Renderiza menu de três pontinhos em cada livro da estante para ações rápidas', () => {
    const rootShelf = createMockEl('div');
    const livro = {
      title: 'Clean Architecture',
      author: 'Robert C. Martin',
      current_page: 50,
      total_pages: 300,
      status: 'Lendo',
      file: { path: '04_Leituras/Livros/CA.md', name: 'CA' }
    };

    const ctx = {
      onSelectLivro: () => {},
      modais: {
        abrirModalProgresso: () => {},
        abrirModalEditarMetadados: () => {},
        abrirModalConfirmarExclusao: () => {}
      }
    };

    BookshelfView.renderShelfGrid(rootShelf, [livro], livro, ctx);
    assert.ok(rootShelf.children.length > 0);
    assert.match(rootShelf.innerHTML, /⋮/);
  });

  test('Renderiza painel retrátil de desafios de leitura e recomendações de estudo', () => {
    const rootDesafios = createMockEl('div');
    const livros = [
      { title: 'Clean Architecture', category: 'Programação', status: 'Lido', finished: '2026-02-10', total_pages: 355 },
      { title: 'Refactoring', category: 'Programação', status: 'Quero ler', total_pages: 400 }
    ];
    const materias = [
      { title: 'Arquitetura de Software', area: 'Programação', status: 'Ativo' },
      { title: 'Bioquímica', area: 'Saúde', status: 'Ativo' }
    ];
    const GamificacaoLeituras = require('../../../99_Meta/Snoopy/subdashboards/leituras/gamificacao.js');

    const ctx = {
      gamificacao: GamificacaoLeituras,
      modais: { abrirModalBuscaNuvem: () => {} },
      onSelectLivro: () => {}
    };

    BookshelfView.renderDesafiosPainel(rootDesafios, livros, materias, ctx);
    assert.ok(rootDesafios.children.length > 0);
    assert.match(rootDesafios.innerHTML, /DESAFIOS DE LEITURA & RECOMENDAÇÕES/);
    assert.match(rootDesafios.innerHTML, /Meta Anual:/);
    assert.match(rootDesafios.innerHTML, /Refactoring/);
    assert.match(rootDesafios.innerHTML, /Bioquímica/);
    assert.match(rootDesafios.innerHTML, /\+ Buscar Nuvem/);
  });

  test('Renderiza Dashboard completo estilo KOReader Bookshelf', () => {
    const rootDash = createMockEl('div');
    const dadosDashboard = {
      relogio: {
        diaSemana: 'Sábado',
        dataFormatada: 'Sábado, 10 de Outubro',
        hora: 14,
        minuto: 30
      },
      tempoLeitura: {
        minutosHoje: 45,
        minutosSemana: 120,
        minutosTotal: 300,
        horasFormatadas: '5.0h',
        velocidadePagsHora: 42
      },
      metas: {
        diaria: { meta: 25, paginasHoje: 30, porcentagem: 100, batida: true },
        semanal: { metaHoras: 5, horasLidas: 2.0, pct: 40 }
      },
      ofensiva: {
        streakAtual: 7,
        recordeStreak: 14,
        historico7Dias: [
          { data: '2026-10-10', diaSemana: 'SAB', leu: true, paginas: 30 }
        ]
      },
      desafios: {
        desafioAnual: { meta: 12, concluidos: 4, pct: 33 },
        desafioDiversidade: { generosExplorados: ['Ficção', 'História'], concluiuMeta: false },
        desafioTijolo: { totalDensos: 3, lidosDensos: 1 }
      },
      series: [
        { nome: 'Fundação', totalLivros: 3, livrosLidos: 2, progressoPct: 67, livros: [] }
      ],
      destaquesCitacoes: [
        { livro: 'Duna', autor: 'Frank Herbert', citacao: 'O medo é o assassino da mente.' }
      ],
      descoberta: {
        livro: { title: 'Neuromancer', author: 'William Gibson' },
        motivo: 'Ficção Científica clássica'
      },
      generosMaisLidos: [
        { genero: 'Ficção Científica', quantidade: 5 },
        { genero: 'Filosofia', quantidade: 3 }
      ],
      distribuicaoAcervo: {
        total: 10,
        lidos: 5,
        lendo: 2,
        queroLer: 3,
        pctLidos: 50,
        pctLendo: 20,
        pctQueroLer: 30,
        paginasCatalogo: 3200,
        paginasLidas: 1800
      },
      leituraAtiva: {
        titulo: 'Messias de Duna',
        autor: 'Frank Herbert',
        paginasAtuais: 150,
        paginasTotais: 300,
        pct: 50,
        diasEstimados: 6,
        livro: { file: { path: '04_Leituras/Messias.md' } }
      },
      padraoSemanal: {
        dias: [
          { diaSemana: 'Domingo', diaCurto: 'DOM', paginas: 40, pct: 25 },
          { diaSemana: 'Sábado', diaCurto: 'SAB', paginas: 60, pct: 40 }
        ],
        diaPico: { diaSemana: 'Sábado', paginas: 60, pct: 40 }
      }
    };

    const ctx = {
      onSelectLivro: () => {},
      onVoltarEstante: () => {}
    };

    BookshelfView.renderDashboardKOReader(rootDash, dadosDashboard, ctx);
    assert.ok(rootDash.children.length > 0);
    // Relógio e data
    assert.match(rootDash.innerHTML, /<svg/); // Relógio analógico SVG
    assert.match(rootDash.innerHTML, /Sábado, 10 de Outubro/);
    assert.match(rootDash.innerHTML, /45 min/);
    assert.match(rootDash.innerHTML, /42 págs\/h/);
    // Leitura Ativa com Capa, Páginas e Estimativa de Dias
    assert.match(rootDash.innerHTML, /Messias de Duna/);
    assert.match(rootDash.innerHTML, /Página 150 de 300 págs/);
    assert.match(rootDash.innerHTML, /faltam 150 págs/);
    assert.match(rootDash.innerHTML, /dias estimados/);
    // Dias Mais Produtivos e Padrão Semanal
    assert.match(rootDash.innerHTML, /DIAS MAIS PRODUTIVOS/);
    assert.match(rootDash.innerHTML, /Sábado/);
    // Distribuição do Acervo e Segmented Bar
    assert.match(rootDash.innerHTML, /DISTRIBUIÇÃO DO ACERVO/);
    assert.match(rootDash.innerHTML, /snoopy-seg-bar/);
    // Gêneros Mais Lidos
    assert.match(rootDash.innerHTML, /GÊNEROS MAIS LIDOS/);
    assert.match(rootDash.innerHTML, /Ficção Científica/);
    // Destaque & Citação
    assert.match(rootDash.innerHTML, /O medo é o assassino da mente\./);
    assert.match(rootDash.innerHTML, /Frank Herbert/);
    // Séries
    assert.match(rootDash.innerHTML, /Fundação/);
    assert.match(rootDash.innerHTML, /67%/);
    // Descoberta
    assert.match(rootDash.innerHTML, /Neuromancer/);
    // Zero emojis
    assert.doesNotMatch(rootDash.innerHTML, /[\u{1F300}-\u{1FAFF}]/u);
  });

  test('renderHistoricoConstancia() gera o Heatmap de 30 dias, card de estágio e métricas laterais', () => {
    const rootHist = createMockEl('div');
    const historico = {
      totalPaginas: 280,
      weekPaginas: 90,
      peakPaginas: 45,
      streak: 6,
      dias: Array.from({ length: 30 }, (_, i) => ({ dataStr: `2026-10-${i+1}`, valor: 10, nivel: 2 }))
    };
    const estagio = {
      iconName: 'book-open',
      titulo: 'Devorador de Livros',
      descricao: 'Consistência notável.',
      badge: 'NÍVEL 3',
      pct: 75
    };
    const ctx = {
      renderIcon: (el, name) => el.createEl('span', { text: `[icon:${name}]` })
    };

    BookshelfView.renderHistoricoConstancia(rootHist, historico, estagio, ctx);
    assert.ok(rootHist.children.length > 0);
    assert.match(rootHist.innerHTML, /HISTÓRICO & CONSTÂNCIA DE LEITURA/);
    assert.match(rootHist.innerHTML, /Devorador de Livros/);
    assert.match(rootHist.innerHTML, /Na Semana:/);
    assert.match(rootHist.innerHTML, /Maior Leitura:/);
    assert.match(rootHist.innerHTML, /snoopy-heat-grid/);
  });

  test('renderShelfGrid renderiza ribbons com iconografia vetorial sem caracteres literais', () => {
    const rootShelf = createMockEl('div');
    const livros = [
      {
        file: { name: 'Livro Lido', path: '04_Leituras/Livros/Livro Lido.md' },
        status: 'Lido',
        total_paginas: 200,
        paginas_lidas: 200
      }
    ];
    let iconRendered = false;
    const ctx = {
      renderIcon: (el, name) => {
        if (name === 'check') iconRendered = true;
        return el.createEl('span', { text: `[icon:${name}]` });
      }
    };
    BookshelfView.renderShelfGrid(rootShelf, livros, null, ctx);
    assert.ok(iconRendered, 'Deve renderizar ícone check vetorial na ribbon de livro concluído');
  });
});



const { test, describe } = require('node:test');
const assert = require('node:assert');
const { renderAbaCiclo } = require('../../../99_Meta/Snoopy/subdashboards/estudos/abas/aba_ciclo.js');

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

describe('Subdashboard Estudos - Aba Ciclo', () => {
  test('Exporta a função renderAbaCiclo', () => {
    assert.strictEqual(typeof renderAbaCiclo, 'function');
  });

  test('Renderiza a visualização do ciclo contínuo sem erros em mock de DOM', () => {
    const root = createMockEl('div');
    const mockCtx = {
      app: { workspace: { openLinkText: () => {} } },
      estado: {
        disciplinaAtualIdx: 0,
        cicloOrdem: ['Direito Constitucional', 'Economia']
      },
      disciplinas: [
        { nome: 'Direito Constitucional', area: 'Concurso', minutos: 180, path: '03_Estudos/Direito.md' },
        { nome: 'Economia', area: 'Geral', minutos: 90, path: '03_Estudos/Economia.md' }
      ],
      modais: {
        abrirModalOrganizarCiclo: () => {},
        abrirModalSessao: () => {}
      },
      obterFilaDoCiclo: (discs) => discs,
      salvarEstado: async () => {},
      onReload: () => {}
    };

    renderAbaCiclo(root, mockCtx);
    assert.ok(root.children.length > 0);
  });

  test('Renderiza ícones SVG e não contém emojis de interface (💡, ↷, ✓, →)', () => {
    const root = createMockEl('div');
    const mockCtx = {
      app: { workspace: { openLinkText: () => {} } },
      estado: {
        disciplinaAtualIdx: 0,
        cicloOrdem: ['Direito Constitucional']
      },
      disciplinas: [
        { nome: 'Direito Constitucional', area: 'Concurso', minutos: 180, path: '03_Estudos/Direito.md' }
      ],
      modais: {
        abrirModalOrganizarCiclo: () => {},
        abrirModalSessao: () => {}
      },
      obterFilaDoCiclo: (discs) => discs,
      salvarEstado: async () => {},
      onReload: () => {}
    };

    renderAbaCiclo(root, mockCtx);

    function checkNoObservedEmojis(el) {
      const html = el.innerHTML || '';
      const text = el.innerText || '';
      const prohibited = ['💡', '↷', '✓', '→'];
      for (const p of prohibited) {
        assert.ok(!html.includes(p) && !text.includes(p), `Interface da Aba Ciclo não deve conter o caractere obsoleto "${p}"`);
      }
      for (const child of el.children) {
        checkNoObservedEmojis(child);
      }
    }

    checkNoObservedEmojis(root);
  });

  test('Exibe fila operacional com métricas por matéria, controles inline de reordenação e vínculo com a Home', () => {
    const root = createMockEl('div');
    const mockCtx = {
      app: { vault: {}, workspace: { openLinkText: () => {} } },
      estado: {
        disciplinaAtualIdx: 0,
        cicloOrdem: ['Direito Constitucional']
      },
      disciplinas: [
        { nome: 'Direito Constitucional', area: 'Concurso', minutos: 180, feitas: 20, acertos: 16, pct: 80, path: '03_Estudos/Direito.md' },
        { nome: 'Economia', area: 'Geral', minutos: 90, feitas: 10, acertos: 7, pct: 70, path: '03_Estudos/Economia.md' }
      ],
      modais: {
        abrirModalOrganizarCiclo: () => {},
        abrirModalSessao: () => {},
        abrirModalCriarTarefaMateria: () => {}
      },
      obterFilaDoCiclo: (discs) => [discs[0]],
      salvarEstado: async () => {},
      onReload: () => {}
    };

    renderAbaCiclo(root, mockCtx);

    function collectHtml(el) {
      let s = (el.innerHTML || '') + ' ' + (el.innerText || '');
      for (const c of el.children) s += ' ' + collectHtml(c);
      return s;
    }

    const html = collectHtml(root);
    assert.ok(html.includes('CICLO DE ESTUDOS CONTÍNUO'), 'Deve manter título principal do ciclo');
    assert.ok(html.includes('btn-ciclo-up') || html.includes('btn-ciclo-down'), 'Deve exibir controles inline de ordenação na fila');
    assert.ok(html.includes('Economia'), 'Deve listar matérias fora da rotação para inclusão em 1 clique');
    assert.ok(html.includes('quick-ciclo-estudo-titulo'), 'Deve permitir cadastrar diversos estudos específicos dentro de um tema no ciclo');
  });
});


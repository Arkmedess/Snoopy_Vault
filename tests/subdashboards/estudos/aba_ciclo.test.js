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
});


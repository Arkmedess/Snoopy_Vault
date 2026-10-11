const { test, describe } = require('node:test');
const assert = require('node:assert');
const { renderAbaPainel } = require('../../../99_Meta/Snoopy/subdashboards/estudos/abas/aba_painel.js');

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
});


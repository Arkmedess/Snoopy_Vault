const { test, describe } = require('node:test');
const assert = require('node:assert');
const { renderAbaPlanner, formatarDataBR } = require('../../../99_Meta/Snoopy/subdashboards/estudos/abas/aba_planner.js');

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

describe('Subdashboard Estudos - Aba Planner', () => {
  test('formatarDataBR converte corretamente data ISO para formato brasileiro', () => {
    assert.strictEqual(formatarDataBR('2026-10-15'), '15/10/2026');
    assert.strictEqual(formatarDataBR(''), '');
    assert.strictEqual(formatarDataBR('invalido'), 'invalido');
  });

  test('Renderiza o calendário mensal do planner sem erros em mock de DOM', () => {
    const root = createMockEl('div');
    const mockCtx = {
      app: {},
      estado: {
        planner: {
          '2026-10-15': [{ materia: 'Algoritmos', tempo: '1h', tipo: 'Teoria' }]
        }
      },
      disciplinas: [{ nome: 'Algoritmos', area: 'Programação' }],
      modais: { abrirModalSessao: () => {} },
      plannerAno: 2026,
      plannerMes: 9, // Outubro (0-indexed)
      setPlannerData: () => {},
      salvarEstado: async () => {},
      onReload: () => {}
    };

    renderAbaPlanner(root, mockCtx);
    assert.ok(root.children.length > 0);
  });
});


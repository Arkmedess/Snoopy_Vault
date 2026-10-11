const { test, describe } = require('node:test');
const assert = require('node:assert');
const { renderAbaRevisoes, formatarDataBR } = require('../../../99_Meta/Snoopy/subdashboards/estudos/abas/aba_revisoes.js');

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

describe('Subdashboard Estudos - Aba Revisões', () => {
  test('Exporta a função renderAbaRevisoes e formatarDataBR', () => {
    assert.strictEqual(typeof renderAbaRevisoes, 'function');
    assert.strictEqual(typeof formatarDataBR, 'function');
    assert.strictEqual(formatarDataBR('2026-10-15'), '15/10/2026');
  });

  test('Renderiza a lista de revisões sem erros em mock de DOM', () => {
    const root = createMockEl('div');
    const mockCtx = {
      app: { workspace: { openLinkText: () => {} } },
      estado: {
        revisoes: [
          {
            materiaPath: '03_Estudos/Física.md',
            nome: 'Física',
            ultimaRevisao: '2026-10-09',
            proximaRevisao: '2026-10-10',
            intervaloDias: 1,
            tipo: 'Teoria + Questões',
            status: 'programada'
          }
        ]
      },
      revisaoFiltro: 'programadas',
      setRevisaoFiltro: () => {},
      salvarEstado: async () => {},
      onReload: () => {}
    };

    renderAbaRevisoes(root, mockCtx);
    assert.ok(root.children.length > 0);
  });
});


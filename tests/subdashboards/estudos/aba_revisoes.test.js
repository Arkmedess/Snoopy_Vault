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

  test('Exibe KPIs de retenção, agendamento rápido de revisão e destaca revisões atrasadas mesmo na visão inicial', () => {
    const root = createMockEl('div');
    const mockCtx = {
      app: { vault: {}, workspace: { openLinkText: () => {} } },
      estado: {
        revisoes: [
          {
            materiaPath: '03_Estudos/Exemplo - Arquitetura de Software.md',
            nome: 'Arquitetura de Software',
            ultimaRevisao: '2026-10-04',
            proximaRevisao: '2026-10-05',
            intervaloDias: 1,
            tipo: 'Teoria + Questões',
            status: 'programada'
          }
        ]
      },
      disciplinas: [
        {
          nome: 'Arquitetura de Software',
          path: '03_Estudos/Exemplo - Arquitetura de Software.md',
          area: 'Programação',
          minutos: 100,
          feitas: 10,
          acertos: 8,
          pct: 80
        }
      ],
      modais: { abrirModalSessao: () => {}, abrirModalCriarTarefaMateria: () => {} },
      revisaoFiltro: 'programadas',
      setRevisaoFiltro: () => {},
      salvarEstado: async () => {},
      onReload: () => {}
    };

    renderAbaRevisoes(root, mockCtx);

    function collectHtml(el) {
      let s = (el.innerHTML || '') + ' ' + (el.innerText || '');
      for (const c of el.children) s += ' ' + collectHtml(c);
      return s;
    }

    const html = collectHtml(root);
    assert.ok(html.includes('CURVA DE ESQUECIMENTO'), 'Deve manter título da seção de revisões');
    assert.ok(html.includes('quick-rev-mat'), 'Deve possuir barra de agendamento rápido de revisão');
    assert.ok(html.includes('Arquitetura de Software'), 'Deve exibir revisão atrasada/pendente sem deixar tela vazia');
    assert.ok(html.includes('80%'), 'Deve cruzar revisão com a assertividade da matéria');
  });
});


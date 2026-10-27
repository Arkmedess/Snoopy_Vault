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

  test('Renderiza ícones SVG para navegação e não contém setas unicode literais (←, →)', () => {
    const root = createMockEl('div');
    const mockCtx = {
      app: {},
      estado: { planner: {} },
      disciplinas: [],
      modais: {},
      plannerAno: 2026,
      plannerMes: 9,
      setPlannerData: () => {},
      salvarEstado: async () => {},
      onReload: () => {}
    };

    renderAbaPlanner(root, mockCtx);

    function checkNoObservedArrows(el) {
      const html = el.innerHTML || '';
      const text = el.innerText || '';
      assert.ok(!html.includes('←') && !text.includes('←'), 'Interface não deve conter a seta literal "←"');
      assert.ok(!html.includes('→') && !text.includes('→'), 'Interface não deve conter a seta literal "→"');
      for (const child of el.children) {
        checkNoObservedArrows(child);
      }
    }

    checkNoObservedArrows(root);
  });

  test('Exibe agendamento rápido inline, resumo executivo do mês e integra revisões no calendário', () => {
    const root = createMockEl('div');
    const mockCtx = {
      app: { vault: {} },
      estado: {
        planner: {
          '2026-10-15': [{ materia: 'Arquitetura de Software', tempo: '1h30m', tipo: 'Questões' }]
        },
        revisoes: [
          { nome: 'Arquitetura de Software', proximaRevisao: '2026-10-20', intervaloDias: 7, status: 'programada' }
        ],
        historicoDiario: {
          '2026-10-10': { minutosFoco: 90, questoesFeitas: 15, questoesAcertos: 12 }
        }
      },
      disciplinas: [{ nome: 'Arquitetura de Software', area: 'Programação', minutos: 90, feitas: 15, acertos: 12, pct: 80 }],
      modais: { abrirModalSessao: () => {} },
      plannerAno: 2026,
      plannerMes: 9,
      setPlannerData: () => {},
      salvarEstado: async () => {},
      onReload: () => {}
    };

    renderAbaPlanner(root, mockCtx);

    function collectHtml(el) {
      let s = (el.innerHTML || '') + ' ' + (el.innerText || '');
      for (const c of el.children) s += ' ' + collectHtml(c);
      return s;
    }

    const html = collectHtml(root);
    assert.ok(html.includes('quick-plan-mat'), 'Deve exibir barra/painel de agendamento rápido sem exigir modal');
    assert.ok(html.includes('Rev:'), 'Deve integrar revisões programadas nas células do calendário');
    assert.ok(html.includes('1h30m'), 'Deve exibir duração dos blocos agendados');
  });
});


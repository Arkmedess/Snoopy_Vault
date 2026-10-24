/**
 * Snoopy Vault - Testes Unitários de Gerador de Gráficos SVG Puros
 * Executado nativamente via `node --test`.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const GraficosSVG = require('../../../99_Meta/Snoopy/subdashboards/estudos/graficos_svg.js');

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
    }
  };
  return el;
}

describe('Subdashboard Estudos - GraficosSVG', () => {
  test('Exporta paleta de cores e geradores de cards', () => {
    assert.ok(Array.isArray(GraficosSVG.CORES_PALETA));
    assert.ok(GraficosSVG.CORES_PALETA.length >= 6);
    assert.strictEqual(typeof GraficosSVG.montarDonutCard, 'function');
    assert.strictEqual(typeof GraficosSVG.montarLineChartCard, 'function');
  });

  describe('montarDonutCard()', () => {
    test('renderiza donut com estado vazio seguro quando totalMinutosGlobal for zero', () => {
      const container = createMockEl('div');
      const card = GraficosSVG.montarDonutCard(container, {
        disciplinasFiltradas: [],
        totalMinutosGlobal: 0,
        totalHorasTxt: '0h00m'
      });

      assert.strictEqual(card.className, 'snoopy-card-box');
      assert.ok(card.innerHTML.includes('HORAS POR MATÉRIA'));
      assert.ok(card.innerHTML.includes('Total: 0h00m'));

      // Verifica SVG interno
      const svgWrapper = card.children[0].children[0];
      assert.ok(svgWrapper.innerHTML.includes('<svg width="130" height="130" viewBox="0 0 130 130"'));
      assert.ok(svgWrapper.innerHTML.includes('stroke="rgba(255,255,255,0.08)"'));
      assert.ok(!svgWrapper.innerHTML.includes('NaN'));
    });

    test('renderiza fatias proporcionais e legenda para disciplinas ativas', () => {
      const container = createMockEl('div');
      const disciplinas = [
        { nome: 'Português', minutos: 120 },
        { nome: 'Matemática', minutos: 60 }
      ];

      const card = GraficosSVG.montarDonutCard(container, {
        disciplinasFiltradas: disciplinas,
        totalMinutosGlobal: 180,
        totalHorasTxt: '3h00m'
      });

      const svgWrapper = card.children[0].children[0];
      const svgHtml = svgWrapper.innerHTML;

      // Verifica cálculos de fatias
      const raio = 50;
      const circunferencia = 2 * Math.PI * raio; // ~314.159
      assert.ok(!svgHtml.includes('NaN'));
      assert.ok(svgHtml.includes(`stroke="${GraficosSVG.CORES_PALETA[0]}"`));
      assert.ok(svgHtml.includes(`stroke="${GraficosSVG.CORES_PALETA[1]}"`));

      // Verifica legenda
      const legendaBox = card.children[0].children[1];
      assert.strictEqual(legendaBox.children.length, 2);
      assert.ok(legendaBox.children[0].innerHTML.includes('Português'));
      assert.ok(legendaBox.children[0].innerHTML.includes('2h0m (67%)'));
      assert.ok(legendaBox.children[1].innerHTML.includes('Matemática'));
      assert.ok(legendaBox.children[1].innerHTML.includes('1h0m (33%)'));
    });
  });

  describe('montarLineChartCard()', () => {
    test('renderiza gráfico de área e linha dos últimos 7 dias com coordenadas consistentes', () => {
      const container = createMockEl('div');
      const ultimos7Dias = [
        { data: '2026-10-18', diaSemana: 'Dom', minutos: 60, isHoje: false },
        { data: '2026-10-19', diaSemana: 'Seg', minutos: 120, isHoje: false },
        { data: '2026-10-20', diaSemana: 'Ter', minutos: 0, isHoje: false },
        { data: '2026-10-21', diaSemana: 'Qua', minutos: 90, isHoje: false },
        { data: '2026-10-22', diaSemana: 'Qui', minutos: 180, isHoje: false },
        { data: '2026-10-23', diaSemana: 'Sex', minutos: 150, isHoje: false },
        { data: '2026-10-24', diaSemana: 'Sáb', minutos: 100, isHoje: true }
      ];

      const card = GraficosSVG.montarLineChartCard(container, {
        ultimos7Dias,
        mediaHorasTxt: '1h42m',
        maxMinutosPlot: 180,
        mediaMinutosDia: 100
      });

      assert.strictEqual(card.className, 'snoopy-card-box');
      assert.ok(card.innerHTML.includes('TEMPO DE ESTUDO & FOCO (7 DIAS)'));
      assert.ok(card.innerHTML.includes('Média: 1h42m/dia'));

      const lineSvgContainer = card.children[0];
      const svgHtml = lineSvgContainer.innerHTML;

      // Valida elementos SVG essenciais
      assert.ok(svgHtml.includes('<svg width="100%" height="125" viewBox="0 0 345 125"'));
      assert.ok(svgHtml.includes('id="areaGradEstudos"'));
      assert.ok(svgHtml.includes('<path d="M '));
      assert.ok(!svgHtml.includes('NaN'));

      // Valida rótulos de dias da semana
      assert.ok(svgHtml.includes('Dom'));
      assert.ok(svgHtml.includes('Seg'));
      assert.ok(svgHtml.includes('Sáb'));

      // Valida formatação de minutos/horas em texto
      assert.ok(svgHtml.includes('2h')); // 120 min
      assert.ok(svgHtml.includes('3h')); // 180 min
      assert.ok(svgHtml.includes('2h30m')); // 150 min
    });
  });
});

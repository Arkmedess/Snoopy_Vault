const { test, describe } = require('node:test');
const assert = require('node:assert');
const PomodoroJardim = require('../../../99_Meta/Snoopy/modulos/pomodoro/pomodoro_jardim.js');

describe('Módulo Pomodoro - PomodoroJardim', () => {
  test('calcularEstagioPlanta() mapeia níveis e ícones corretamente', () => {
    assert.strictEqual(PomodoroJardim.calcularEstagioPlanta(0).pct, 0);
    assert.strictEqual(PomodoroJardim.calcularEstagioPlanta(0).badge, 'NÍVEL 1');

    assert.strictEqual(PomodoroJardim.calcularEstagioPlanta(1).pct, 20);
    assert.strictEqual(PomodoroJardim.calcularEstagioPlanta(2).pct, 40);

    const cerejeira = PomodoroJardim.calcularEstagioPlanta(4);
    assert.strictEqual(cerejeira.titulo, 'Cerejeira em Flor');
    assert.strictEqual(cerejeira.pct, 65);

    const pinheiro = PomodoroJardim.calcularEstagioPlanta(6);
    assert.strictEqual(pinheiro.titulo, 'Pinheiro Robusto');
    assert.strictEqual(pinheiro.pct, 85);

    const floresta = PomodoroJardim.calcularEstagioPlanta(8);
    assert.strictEqual(floresta.titulo, 'Floresta Mágica');
    assert.strictEqual(floresta.pct, 100);
    assert.strictEqual(floresta.badge, 'MESTRE');
  });

  test('calcularHistorico30Dias() agrega métricas e calcula sequência de dias', () => {
    const mapa = {
      '2026-10-08': 3,
      '2026-10-09': 4,
      '2026-10-10': 2
    };

    const ref = new Date('2026-10-10T12:00:00Z');
    const res = PomodoroJardim.calcularHistorico30Dias(mapa, '2026-10-10', ref);

    assert.strictEqual(res.dias.length, 30);
    assert.strictEqual(res.totalPomos, 9);
    assert.strictEqual(res.peakPomos, 4);
    assert.strictEqual(res.streak, 3);
  });
});


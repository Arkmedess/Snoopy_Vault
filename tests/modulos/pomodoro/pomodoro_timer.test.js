const { test, describe } = require('node:test');
const assert = require('node:assert');
const PomodoroTimer = require('../../../99_Meta/Snoopy/modulos/pomodoro/pomodoro_timer.js');

describe('Módulo Pomodoro - PomodoroTimer', () => {
  test('Inicialização e formatação de tempo', () => {
    const timer = new PomodoroTimer({ focusMin: 25, breakMin: 5 });
    assert.strictEqual(timer.formatarTempo(1500), '25:00');
    assert.strictEqual(timer.formatarTempo(65), '01:05');
    assert.strictEqual(timer.formatarTempo(0), '00:00');
  });

  test('Cálculo de offset do círculo SVG', () => {
    const timer = new PomodoroTimer();
    // Início (100% restante): offset deve ser 0
    assert.strictEqual(timer.calcularStrokeOffset(1500, 1500), 0);
    // Metade (50% restante): offset deve ser metade da circunferência
    const metade = timer.calcularStrokeOffset(750, 1500, 100);
    assert.strictEqual(metade, 50);
    // Fim (0 restante): offset deve ser a circunferência inteira
    assert.strictEqual(timer.calcularStrokeOffset(0, 1500, 100), 100);
  });

  test('Alternância entre modo foco e modo pausa', () => {
    let modoAtual = 'foco';
    const timer = new PomodoroTimer({
      focusMin: 50,
      breakMin: 10,
      onModeChange: ({ mode }) => { modoAtual = mode; }
    });

    assert.strictEqual(timer.currentMode, 'foco');
    assert.strictEqual(timer.totalSeconds, 3000);

    timer.setMode('pausa');
    assert.strictEqual(timer.currentMode, 'pausa');
    assert.strictEqual(timer.totalSeconds, 600);
    assert.strictEqual(modoAtual, 'pausa');

    timer.setMode('foco');
    assert.strictEqual(timer.currentMode, 'foco');
    assert.strictEqual(timer.totalSeconds, 3000);
  });
});


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

  test('destroy() descarta intervalo com seguranca sem emitir onRunningChange', () => {
    let mudouRunning = false;
    const timer = new PomodoroTimer({
      focusMin: 25,
      onRunningChange: () => { mudouRunning = true; }
    });

    timer.start();
    mudouRunning = false; // Reset da flag apos start

    timer.destroy();
    assert.strictEqual(timer.timerInterval, null);
    assert.strictEqual(mudouRunning, false, 'destroy() nao deve emitir onRunningChange para preservar estado');
  });

  test('start() recupera e finaliza com seguranca quando endAt esta no passado', (t, done) => {
    let completado = false;
    const timer = new PomodoroTimer({
      focusMin: 25,
      endAt: Date.now() - 5000,
      initialRemaining: 0,
      onComplete: () => { completado = true; }
    });

    timer.start();
    setTimeout(() => {
      assert.strictEqual(completado, true, 'Deve finalizar ciclo expirado imediatamente');
      timer.destroy();
      done();
    }, 20);
  });
});


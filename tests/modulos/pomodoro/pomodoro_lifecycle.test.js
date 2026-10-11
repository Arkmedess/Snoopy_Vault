import { test } from 'node:test';
import assert from 'node:assert/strict';
import Lifecycle from '../../../99_Meta/Snoopy/core/lifecycle.js';
import PomodoroTimer from '../../../99_Meta/Snoopy/modulos/pomodoro/pomodoro_timer.js';

test('Pomodoro Lifecycle - deve limpar listeners anteriores ao re-renderizar', () => {
  Lifecycle.dispose('home');
  let ativo = true;

  Lifecycle.onDispose('home', () => {
    ativo = false;
  });

  assert.equal(ativo, true);
  Lifecycle.dispose('home');
  assert.equal(ativo, false);
});

test('PomodoroTimer - método destroy() deve pausar intervalo ativo', () => {
  const timer = new PomodoroTimer({ focusMin: 25 });
  timer.start();
  assert.notEqual(timer.timerInterval, null);

  timer.destroy();
  assert.equal(timer.timerInterval, null);
});


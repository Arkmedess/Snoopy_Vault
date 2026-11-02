/**
 * Snoopy Vault - Testes de Regressão e Reprodução do PomodoroTimer
 * Valida pausas estritas, ausência de contagem em segundo plano,
 * máquina de estados e idempotência de transições.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const PomodoroTimer = require('../../../99_Meta/Snoopy/modulos/pomodoro/pomodoro_timer.js');

describe('PomodoroTimer - Regressão de Pausa e Máquina de Estados', () => {
  test('Pausar interrompe contagem: avançar além do tempo total não dispara onComplete nem altera tempo', (t) => {
    t.mock.timers.enable({ apis: ['setInterval', 'Date', 'setTimeout'] });

    let completeCalls = 0;
    let ticksWhilePaused = 0;
    let isPaused = false;

    const timer = new PomodoroTimer({
      focusMin: 25, // 1500 segundos
      breakMin: 5,
      onTick: () => {
        if (isPaused) ticksWhilePaused++;
      },
      onComplete: () => {
        completeCalls++;
      }
    });

    // 1. Iniciar contagem
    timer.start();
    assert.strictEqual(timer.state, 'running', 'Estado deve ser running após start');

    // 2. Avançar 10 segundos
    t.mock.timers.tick(10000);
    assert.strictEqual(timer.remainingSeconds, 1490, 'Após 10s deve restar 1490s');

    // 3. Pausar
    timer.pause();
    isPaused = true;
    assert.strictEqual(timer.state, 'paused', 'Estado deve ser paused após pause');
    const remainingNaPausa = timer.remainingSeconds;

    // 4. Avançar duração total (25 minutos = 1500s = 1.500.000 ms) enquanto pausado
    t.mock.timers.tick(1500000);

    // 5. Invariantes estritos enquanto pausado
    assert.strictEqual(completeCalls, 0, 'onComplete NUNCA deve ser chamado enquanto pausado');
    assert.strictEqual(ticksWhilePaused, 0, 'Nenhum tick deve ser emitido enquanto pausado');
    assert.strictEqual(timer.remainingSeconds, remainingNaPausa, 'Tempo restante deve permanecer congelado na pausa');

    // 6. Retomar e avançar o restante
    isPaused = false;
    timer.start();
    assert.strictEqual(timer.state, 'running', 'Estado deve voltar para running após retomar');

    t.mock.timers.tick(1490000);
    assert.strictEqual(completeCalls, 1, 'onComplete deve disparar exatamente uma vez ao esgotar o tempo retomado');
    assert.strictEqual(timer.state, 'finished', 'Estado deve ser finished ao concluir');
  });

  test('Pausar e despausar repetidamente com cliques rápidos não perde frações de segundo nem cria múltiplos intervalos', (t) => {
    t.mock.timers.enable({ apis: ['setInterval', 'Date', 'setTimeout'] });

    const timer = new PomodoroTimer({ focusMin: 25 });
    timer.start();

    // Avança 500ms
    t.mock.timers.tick(500);

    // Simula cliques rápidos / duplo clique
    timer.pause();
    timer.pause(); // Transição redundante inválida ignorada
    assert.strictEqual(timer.state, 'paused');

    timer.start();
    timer.start(); // Chamada redundante não duplica intervalo
    assert.strictEqual(timer.state, 'running');

    // Avança mais 500ms (totalizando 1000ms corridos)
    t.mock.timers.tick(500);
    timer.pause();

    // Deve ter consumido exatamente 1s de foco, restando 1499s
    assert.strictEqual(timer.remainingSeconds, 1499);
  });

  test('Pausar com poucos milissegundos restantes preserva remainingMs exato sem finalizar precocemente', (t) => {
    t.mock.timers.enable({ apis: ['setInterval', 'Date', 'setTimeout'] });

    let completeDisparado = false;
    const timer = new PomodoroTimer({
      focusMin: 1, // 60 segundos
      onComplete: () => { completeDisparado = true; }
    });

    timer.start();
    // Avança 59.8 segundos (restando apenas 200ms)
    t.mock.timers.tick(59800);
    assert.strictEqual(completeDisparado, false);

    // Pausa com 200ms restantes
    timer.pause();
    assert.strictEqual(timer.state, 'paused');
    assert.strictEqual(completeDisparado, false);

    // Aguarda 10 minutos pausado
    t.mock.timers.tick(600000);
    assert.strictEqual(completeDisparado, false, 'Não deve finalizar enquanto pausado');

    // Retoma: agora os 200ms devem decorrer
    timer.start();
    t.mock.timers.tick(100);
    assert.strictEqual(completeDisparado, false, 'Com 100ms ainda não deve ter finalizado');

    t.mock.timers.tick(150);
    assert.strictEqual(completeDisparado, true, 'Deve finalizar após decorrer os 200ms restantes');
  });

  test('Alterar configurações de tempo enquanto pausado atualiza totalSeconds sem quebrar o estado', () => {
    const timer = new PomodoroTimer({ focusMin: 25, breakMin: 5 });
    timer.start();
    timer.pause();
    assert.strictEqual(timer.state, 'paused');

    timer.setTempos(30, 10);
    assert.strictEqual(timer.focusMin, 30);
    assert.strictEqual(timer.breakMin, 10);
    assert.strictEqual(timer.state, 'paused', 'Não deve resetar nem iniciar silenciosamente ao alterar tempo pausado');
  });

  test('Reset enquanto pausado redefine remainingSeconds e transita para idle', () => {
    const timer = new PomodoroTimer({ focusMin: 25, breakMin: 5 });
    timer.start();
    timer.pause();
    assert.strictEqual(timer.state, 'paused');

    timer.reset();
    assert.strictEqual(timer.state, 'idle');
    assert.strictEqual(timer.remainingSeconds, 1500);
  });
});

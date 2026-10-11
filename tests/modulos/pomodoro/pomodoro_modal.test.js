const { test, describe } = require('node:test');
const assert = require('node:assert');
const PomodoroModal = require('../../../99_Meta/Snoopy/modulos/pomodoro/pomodoro_modal.js');

describe('Módulo Pomodoro - PomodoroModal', () => {
  test('Instanciação correta com dependências e fallbacks seguros', () => {
    let pausaIniciada = false;
    const mockCtx = {
      app: { vault: {}, fileManager: {} },
      ModalFactory: { abrir: () => {} },
      VaultStore: { adicionarLinhaEmSecao: async () => {} },
      garantirNotaDiaria: async () => ({ path: '01_Inbox/Diário/2026-10-10.md' }),
      todayStr: '2026-10-10',
      onPausaIniciar: () => { pausaIniciada = true; }
    };

    const modal = new PomodoroModal(mockCtx);
    assert.ok(modal);
    assert.strictEqual(typeof modal.registrarLogNaNotaDiaria, 'function');
    assert.strictEqual(typeof modal.salvarPomodoroNaNotaDiaria, 'function');
    assert.strictEqual(typeof modal.sincronizarComCicloEstudos, 'function');
    assert.strictEqual(typeof modal.abrirModalAnotacao, 'function');
  });
});


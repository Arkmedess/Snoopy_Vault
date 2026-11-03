const { test, describe } = require('node:test');
const assert = require('node:assert');
const PomodoroTimer = require('../../../99_Meta/Snoopy/modulos/pomodoro/pomodoro_timer.js');
const PomodoroModal = require('../../../99_Meta/Snoopy/modulos/pomodoro/pomodoro_modal.js');

describe('Módulo Pomodoro - Popup de Fim de Foco (+5 min ou Pausa)', () => {
  test('PomodoroTimer: estenderFoco(5) redefine tempo de foco e inicia contagem regressiva', () => {
    let modeNotificado = null;
    let runningNotificado = null;

    const timer = new PomodoroTimer({
      focusMin: 25,
      breakMin: 5,
      onModeChange: ({ mode }) => { modeNotificado = mode; },
      onRunningChange: ({ isRunning }) => { runningNotificado = isRunning; }
    });

    // Simula que timer finalizou
    timer.currentMode = 'foco';
    timer.remainingSeconds = 0;
    timer.state = 'finished';

    timer.estenderFoco(5);

    assert.strictEqual(timer.currentMode, 'foco');
    assert.strictEqual(timer.totalSeconds, 300);
    assert.strictEqual(timer.remainingSeconds, 300);
    assert.strictEqual(timer.state, 'running');
    assert.strictEqual(modeNotificado, 'foco');
    assert.strictEqual(runningNotificado, true);
    assert.ok(timer.endAt > Date.now());

    timer.destroy();
  });

  test('PomodoroModal: abrirModalFimFoco renderiza botoes e contador', () => {
    let modalAberto = false;
    let htmlRecebido = '';
    const mockBox = {
      innerHTML: '',
      querySelector: (sel) => {
        if (sel === '#snoopy-btn-extra-5m') return { onclick: null };
        if (sel === '#snoopy-btn-start-break') return { onclick: null };
        if (sel === '#snoopy-auto-pause-counter') return { textContent: '30s' };
        if (sel === '#modal-close-btn') return { onclick: null };
        return null;
      }
    };

    const mockModalFactory = {
      abrir: ({ htmlContent, onMontar }) => {
        modalAberto = true;
        htmlRecebido = htmlContent;
        let fechado = false;
        const fechar = () => { fechado = true; };
        if (typeof onMontar === 'function') onMontar(mockBox, fechar);
        return { modalBox: mockBox, fechar };
      }
    };

    const modal = new PomodoroModal({
      app: {},
      ModalFactory: mockModalFactory,
      VaultStore: {},
      garantirNotaDiaria: async () => ({}),
      todayStr: '2026-11-02'
    });

    assert.strictEqual(typeof modal.abrirModalFimFoco, 'function');
    modal.abrirModalFimFoco({
      onAdicionarExtra: () => {},
      onIniciarPausa: () => {},
      tempoAutoPausaSegundos: 30
    });

    assert.strictEqual(modalAberto, true);
    assert.ok(htmlRecebido.includes('snoopy-btn-extra-5m'));
    assert.ok(htmlRecebido.includes('snoopy-btn-start-break'));
    assert.ok(htmlRecebido.includes('snoopy-auto-pause-counter'));
  });

  test('PomodoroModal: clicar em +5 min Extras chama onAdicionarExtra e cancela timer', () => {
    let extraChamado = false;
    let pausaChamada = false;
    let modalFechado = false;

    let btnExtraMock = { onclick: null };
    let btnPausaMock = { onclick: null };
    let counterMock = { textContent: '30s' };

    const mockBox = {
      querySelector: (sel) => {
        if (sel === '#snoopy-btn-extra-5m') return btnExtraMock;
        if (sel === '#snoopy-btn-start-break') return btnPausaMock;
        if (sel === '#snoopy-auto-pause-counter') return counterMock;
        return null;
      }
    };

    const mockModalFactory = {
      abrir: ({ htmlContent, onMontar }) => {
        const fechar = () => { modalFechado = true; };
        if (typeof onMontar === 'function') onMontar(mockBox, fechar);
        return { modalBox: mockBox, fechar };
      }
    };

    const modal = new PomodoroModal({
      app: {},
      ModalFactory: mockModalFactory,
      VaultStore: {},
      garantirNotaDiaria: async () => ({}),
      todayStr: '2026-11-02'
    });

    modal.abrirModalFimFoco({
      onAdicionarExtra: () => { extraChamado = true; },
      onIniciarPausa: () => { pausaChamada = true; },
      tempoAutoPausaSegundos: 30
    });

    assert.ok(typeof btnExtraMock.onclick === 'function');
    btnExtraMock.onclick();

    assert.strictEqual(extraChamado, true);
    assert.strictEqual(pausaChamada, false);
    assert.strictEqual(modalFechado, true);
  });

  test('PomodoroModal: clicar em Iniciar Pausa chama onIniciarPausa imediatamente', () => {
    let extraChamado = false;
    let pausaChamada = false;
    let modalFechado = false;

    let btnExtraMock = { onclick: null };
    let btnPausaMock = { onclick: null };
    let counterMock = { textContent: '30s' };

    const mockBox = {
      querySelector: (sel) => {
        if (sel === '#snoopy-btn-extra-5m') return btnExtraMock;
        if (sel === '#snoopy-btn-start-break') return btnPausaMock;
        if (sel === '#snoopy-auto-pause-counter') return counterMock;
        return null;
      }
    };

    const mockModalFactory = {
      abrir: ({ htmlContent, onMontar }) => {
        const fechar = () => { modalFechado = true; };
        if (typeof onMontar === 'function') onMontar(mockBox, fechar);
        return { modalBox: mockBox, fechar };
      }
    };

    const modal = new PomodoroModal({
      app: {},
      ModalFactory: mockModalFactory,
      VaultStore: {},
      garantirNotaDiaria: async () => ({}),
      todayStr: '2026-11-02'
    });

    modal.abrirModalFimFoco({
      onAdicionarExtra: () => { extraChamado = true; },
      onIniciarPausa: () => { pausaChamada = true; },
      tempoAutoPausaSegundos: 30
    });

    assert.ok(typeof btnPausaMock.onclick === 'function');
    btnPausaMock.onclick();

    assert.strictEqual(extraChamado, false);
    assert.strictEqual(pausaChamada, true);
    assert.strictEqual(modalFechado, true);
  });
});

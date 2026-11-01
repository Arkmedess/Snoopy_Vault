/**
 * Snoopy Vault - E2E Test Suite
 * Tier 3: Cross-Feature Interactions & Combinatorial Flows
 * Pomodoro Focus Session -> Coins Earned -> Shop Purchase -> Audio Unlock & Playback
 * Executed via `node --test tests/e2e/*.test.js`
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  createMockEl,
  criarMockApp,
  createMockLocalStorage,
  MockAudioContext,
  getUIKit,
  getJardimStore,
  getShopStore,
  getPomodoroAudio
} = require('./helpers/e2e_utils.js');

describe('Tier 3: Cross-Feature Interactions', () => {

  // =========================================================================
  // Interaction 1: Focus Session Earnings -> Wallet Balance -> UI Kit KPI
  // =========================================================================
  test('Interaction 1: Focus completion credits coins and updates UI Kit KPI badge', async () => {
    const UIKit = getUIKit();
    const JardimStore = getJardimStore();
    const mockApp = criarMockApp(null);

    // Initial state: 0 coins
    const inicial = await JardimStore.carregar(mockApp);
    assert.strictEqual(inicial.moedas, 0);

    // Complete 25m cycle with combo 3
    const credito = await JardimStore.creditarFoco(mockApp, 25, 3);
    assert.strictEqual(credito.saldoAtual, 6);

    // Render KPI card via UI Kit
    const container = createMockEl('div');
    const kpiBox = container.createEl('div', { cls: 'snoopy-kpi-card' });
    UIKit.renderIcon(kpiBox, 'coins', { size: 16, color: '#facc15' });
    kpiBox.createEl('span', { cls: 'snoopy-kpi-val', text: String(credito.saldoAtual) });
    kpiBox.createEl('span', { cls: 'snoopy-kpi-lbl', text: 'Saldo de Foco' });

    assert.ok(container.innerHTML.includes('<svg'));
    assert.ok(container.innerHTML.includes('6'));
    assert.ok(container.innerHTML.includes('Saldo de Foco'));
    assert.ok(!/\p{Extended_Pictographic}/u.test(container.innerHTML), 'Must not contain emojis');
  });

  // =========================================================================
  // Interaction 2: Shop Purchase -> Unlocking Audio Track -> Playback State
  // =========================================================================
  test('Interaction 2: Purchasing audio track in Shop unlocks track and allows immediate playback', async () => {
    const ShopStore = getShopStore();
    const PomodoroAudio = getPomodoroAudio();

    assert.ok(ShopStore, 'ShopStore must be available');
    assert.ok(PomodoroAudio, 'PomodoroAudio must be available');

    const mockApp = criarMockApp({ saldo: 150, desbloqueados: ['sprout', 'audio-white-noise'] });

    const mockCtx = new MockAudioContext();

    // Verify track is initially locked
    const faixasAntes = await PomodoroAudio.obterFaixasDisponiveis(mockApp);
    assert.strictEqual(faixasAntes.some(f => f.id === 'audio-brown-noise'), false);

    // Purchase brown noise track (80 coins)
    const compra = await ShopStore.comprarItem(mockApp, 'audio-brown-noise');
    assert.strictEqual(compra.sucesso, true);
    assert.strictEqual(ShopStore.obterSaldo(mockApp), 70);

    // Query unlocked tracks now
    const faixasDepois = await PomodoroAudio.obterFaixasDisponiveis(mockApp);
    assert.ok(faixasDepois.some(f => f.id === 'audio-brown-noise'));

    // Play the newly unlocked track
    if (typeof PomodoroAudio.conectarContexto === 'function') {
      PomodoroAudio.conectarContexto(mockCtx);
    }
    await PomodoroAudio.iniciar();
    assert.doesNotThrow(() => PomodoroAudio.tocarFaixa('audio-brown-noise'));
  });

  // =========================================================================
  // Interaction 3: Botanical Species Purchase -> Garden Facade -> Cockpit Dial
  // =========================================================================
  test('Interaction 3: Botanical purchase via JardimStore updates active tree for Cockpit dial', async () => {
    const JardimStore = getJardimStore();
    const mockApp = criarMockApp({ moedas: 120, desbloqueadas: ['sprout'] });

    // Purchase alpine pine (100 coins)
    const compra = await JardimStore.comprarArvore(mockApp, 'tree-pine');
    assert.strictEqual(compra.sucesso, true);
    assert.strictEqual(compra.estado.arvoreAtiva, 'tree-pine');
    assert.strictEqual(compra.estado.moedas, 20);

    // Render cockpit dial representation with active tree
    const UIKit = getUIKit();
    const container = createMockEl('div');
    const dialCard = container.createEl('div', { cls: 'snoopy-cockpit-dial' });
    UIKit.renderIcon(dialCard, compra.estado.arvoreAtiva, { size: 24, color: '#4ade80' });
    dialCard.createEl('span', { cls: 'snoopy-active-tree-name', text: 'Pinheiro Alpino' });

    assert.ok(dialCard.innerHTML.includes('<svg'));
    assert.ok(dialCard.innerHTML.includes('Pinheiro Alpino'));
  });

  // =========================================================================
  // Interaction 4: Volume Adjustment -> LocalStorage -> Timer Sync
  // =========================================================================
  test('Interaction 4: Cockpit volume slider syncs with localStorage and AudioContext gain', () => {
    const storage = createMockLocalStorage();
    const mockCtx = new MockAudioContext();
    const masterGain = mockCtx.createGain();

    // User moves slider to 65%
    const sliderInput = '65';
    const volumeFloat = parseFloat(sliderInput) / 100; // 0.65
    storage.setItem('snoopy_pomodoro_audio_volume', String(volumeFloat));
    storage.setItem('snoopy_pomodoro_audio_autosync', 'true');

    masterGain.gain.setValueAtTime(volumeFloat);
    assert.strictEqual(masterGain.gain.value, 0.65);

    // Simulate timer running -> auto-sync active
    const isAutoSync = storage.getItem('snoopy_pomodoro_audio_autosync') === 'true';
    assert.strictEqual(isAutoSync, true);

    // Reload preference on simulated app restart
    const restoredVol = parseFloat(storage.getItem('snoopy_pomodoro_audio_volume'));
    assert.strictEqual(restoredVol, 0.65);
  });

  // =========================================================================
  // Interaction 5: Autonomous ShopStore -> Backward Compatible JardimStore Facade
  // =========================================================================
  test('Interaction 5: Economy transactions via facade preserve persistent data structure', async () => {
    const JardimStore = getJardimStore();
    const mockApp = criarMockApp(null);

    // Series of focus sessions
    await JardimStore.creditarFoco(mockApp, 25, 1); // +5 -> 5
    await JardimStore.creditarFoco(mockApp, 25, 2); // +5 -> 10
    await JardimStore.creditarFoco(mockApp, 25, 3); // +6 (combo 3) -> 16
    await JardimStore.creditarFoco(mockApp, 50, 4); // +10 + 1 -> +11 -> 27

    const estado = await JardimStore.carregar(mockApp);
    assert.strictEqual(estado.moedas, 27);

    // Buy Cherry Blossom (50 coins) -> Fail
    const failCompra = await JardimStore.comprarArvore(mockApp, 'flower-2');
    assert.strictEqual(failCompra.sucesso, false);
    assert.strictEqual(failCompra.estado.moedas, 27);

    // Earn remaining coins
    await JardimStore.creditarFoco(mockApp, 50, 5); // +10 + 2 -> +12 -> 39
    await JardimStore.creditarFoco(mockApp, 50, 6); // +10 + 2 -> +12 -> 51

    // Buy Cherry Blossom -> Success
    const okCompra = await JardimStore.comprarArvore(mockApp, 'flower-2');
    assert.strictEqual(okCompra.sucesso, true);
    assert.strictEqual(okCompra.estado.moedas, 1);
    assert.ok(okCompra.estado.desbloqueadas.includes('flower-2'));
    assert.strictEqual(okCompra.estado.arvoreAtiva, 'flower-2');
  });

  // =========================================================================
  // Interaction 6: Task Parser Metadata -> Pomodoro Focus -> Coin Award
  // =========================================================================
  test('Interaction 6: Parsing planned task, completing pomodoros, and rewarding wallet', async () => {
    const TaskParser = require('../../99_Meta/Snoopy/core/task_parser.js');
    const DateUtils = require('../../99_Meta/Snoopy/core/date_utils.js');
    const JardimStore = getJardimStore();
    const mockApp = criarMockApp(null);

    // Step 1: Parse task
    const taskLine = 'Estudar arquitetura hexagonal 📅 2026-10-31 ⏫ 🍅 2';
    const parsed = TaskParser.parseMetadata(taskLine, '2026-10-31', DateUtils);
    assert.strictEqual(parsed.dueStr, '2026-10-31');
    assert.strictEqual(parsed.pomosEst, '2');
    assert.strictEqual(parsed.prio, 'alta');

    // Step 2: User completes 2 pomodoro cycles for this task
    let saldo = 0;
    for (let c = 1; c <= parseInt(parsed.pomosEst, 10); c++) {
      const res = await JardimStore.creditarFoco(mockApp, 25, c);
      saldo = res.saldoAtual;
    }
    // Cycle 1: 5 moedas; Cycle 2: 5 moedas -> total 10 moedas
    assert.strictEqual(saldo, 10);
  });

  // =========================================================================
  // Interaction 7: Theme Tokens -> UI Kit Render Tree Consistency
  // =========================================================================
  test('Interaction 7: UI Kit buttons and cards conform to theme token conventions', () => {
    const UIKit = getUIKit();
    const parent = createMockEl('div');

    const header = UIKit.criarCardHeader(parent, {
      title: 'Cockpit Pomodoro',
      icon: 'zap',
      subtitle: 'Sessão Ativa'
    });
    const btn = UIKit.criarBotao(parent, {
      label: 'INICIAR FOCO',
      icon: 'play',
      variant: 'primary'
    });

    assert.ok(header.container.classList.contains('snoopy-card-header'));
    assert.ok(btn.classList.contains('snoopy-btn-primary'));
    // Zero emojis invariant
    assert.ok(!/\p{Extended_Pictographic}/u.test(parent.innerHTML));
  });

  // =========================================================================
  // Interaction 8: Lifecycle Scope -> Audio Stop -> Modal Close
  // =========================================================================
  test('Interaction 8: Lifecycle disposal cleans audio nodes and closes modal simultaneously', () => {
    const Lifecycle = require('../../99_Meta/Snoopy/core/lifecycle.js');
    const mockCtx = new MockAudioContext();
    const source = mockCtx.createBufferSource();

    let audioStopped = false;
    let modalClosed = false;

    source.stop = () => { audioStopped = true; };

    Lifecycle.onDispose('cockpit_session_scope', () => {
      source.stop();
    });
    Lifecycle.onDispose('cockpit_session_scope', () => {
      modalClosed = true;
    });

    // Teardown scope
    Lifecycle.dispose('cockpit_session_scope');

    assert.strictEqual(audioStopped, true);
    assert.strictEqual(modalClosed, true);
  });

});

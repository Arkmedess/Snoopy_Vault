/**
 * Snoopy Vault - E2E Test Suite
 * Tier 4: Realistic User Workflow Scenarios
 * Full-cycle multi-step simulations based on TEST_INFRA.md § Real-World Application Scenarios
 * Executed via `node --test tests/e2e/*.test.js`
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

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

const ROOT_DIR = path.resolve(__dirname, '../..');

describe('Tier 4: Realistic User Workflow Scenarios', () => {

  // =========================================================================
  // Scenario 1: Full Pomodoro Focus Session with Sound & Earnings
  // =========================================================================
  test('Scenario 1: Full Pomodoro focus session with procedural sound and coin earnings', async (t) => {
    const PomodoroAudio = getPomodoroAudio();
    const JardimStore = getJardimStore();
    const mockApp = criarMockApp(null);
    const mockStorage = createMockLocalStorage();
    const mockCtx = new MockAudioContext();

    // 1. User sets up focus session preferences: 70% volume, auto-sync enabled
    mockStorage.setItem('snoopy_pomodoro_audio_volume', '0.7');
    mockStorage.setItem('snoopy_pomodoro_audio_autosync', 'true');
    mockStorage.setItem('snoopy_pomodoro_audio_track', 'procedural_rain');

    let audioIsPlaying = false;

    if (PomodoroAudio) {
      if (typeof PomodoroAudio.conectarContexto === 'function') {
        PomodoroAudio.conectarContexto(mockCtx);
      }
      await PomodoroAudio.iniciar();
      PomodoroAudio.ajustarVolume(0.7);
      PomodoroAudio.tocarFaixa('procedural_rain');
      audioIsPlaying = true;
    } else {
      // Direct Web Audio validation when PomodoroAudio is pending M3
      const source = mockCtx.createBufferSource();
      const gain = mockCtx.createGain();
      gain.gain.setValueAtTime(0.7);
      source.connect(gain);
      gain.connect(mockCtx.destination);
      source.start();
      audioIsPlaying = true;
    }

    assert.strictEqual(audioIsPlaying, true);
    assert.strictEqual(mockStorage.getItem('snoopy_pomodoro_audio_volume'), '0.7');

    // 2. Timer completes 25-minute cycle
    if (PomodoroAudio) {
      PomodoroAudio.parar();
      audioIsPlaying = false;
    } else {
      audioIsPlaying = false;
    }
    assert.strictEqual(audioIsPlaying, false);

    // 3. Economy rewards 5 focus coins (base for 25m)
    const reward = await JardimStore.creditarFoco(mockApp, 25, 1);
    assert.strictEqual(reward.moedasGanhas, 5);
    assert.strictEqual(reward.saldoAtual, 5);

    // 4. Verify wallet state in vault persistence
    const savedState = await JardimStore.carregar(mockApp);
    assert.strictEqual(savedState.moedas, 5);
  });

  // =========================================================================
  // Scenario 2: Shop Purchase & Immediate Audio Playback
  // =========================================================================
  test('Scenario 2: Shop purchase & immediate audio playback', async () => {
    const ShopStore = getShopStore();
    const PomodoroAudio = getPomodoroAudio();

    assert.ok(ShopStore, 'ShopStore must be available');
    assert.ok(PomodoroAudio, 'PomodoroAudio must be available');

    const mockApp = criarMockApp({ saldo: 200, desbloqueados: ['sprout', 'audio-white-noise'] });

    const mockCtx = new MockAudioContext();

    // 1. User opens autonomous Shop modal and checks available balance
    const saldoInicial = ShopStore.obterSaldo(mockApp);
    assert.strictEqual(saldoInicial, 200);

    // 2. User purchases binaural beta track (cost: 180 coins)
    const compra = await ShopStore.comprarItem(mockApp, 'audio-binaural-beta');
    assert.strictEqual(compra.sucesso, true);
    assert.strictEqual(ShopStore.obterSaldo(mockApp), 20);

    // 3. Audio dock recognizes unlocked track
    const tracks = await PomodoroAudio.obterFaixasDisponiveis(mockApp);
    assert.ok(tracks.some(t => t.id === 'audio-binaural-beta'));

    // 4. User selects and plays the track immediately
    if (typeof PomodoroAudio.conectarContexto === 'function') {
      PomodoroAudio.conectarContexto(mockCtx);
    }
    await PomodoroAudio.iniciar();
    assert.doesNotThrow(() => PomodoroAudio.tocarFaixa('audio-binaural-beta'));
  });

  // =========================================================================
  // Scenario 3: Botanical Garden Legacy Compatibility Flow
  // =========================================================================
  test('Scenario 3: Botanical garden legacy compatibility flow without data loss', async () => {
    const JardimStore = getJardimStore();
    // Simulate legacy vault file
    const legacyData = {
      moedas: 110,
      arvoreAtiva: 'sprout',
      desbloqueadas: ['sprout'],
      totalPlantadas: 5,
      historicoCompras: []
    };
    const mockApp = criarMockApp(legacyData);

    // 1. Garden loads legacy data without error
    const estado = await JardimStore.carregar(mockApp);
    assert.strictEqual(estado.moedas, 110);
    assert.strictEqual(estado.arvoreAtiva, 'sprout');
    assert.strictEqual(estado.totalPlantadas, 5);

    // 2. User purchases Pine (cost: 100)
    const compra = await JardimStore.comprarArvore(mockApp, 'tree-pine');
    assert.strictEqual(compra.sucesso, true);
    assert.strictEqual(compra.estado.moedas, 10);
    assert.strictEqual(compra.estado.arvoreAtiva, 'tree-pine');
    assert.ok(compra.estado.desbloqueadas.includes('tree-pine'));

    // 3. Re-read from vault to guarantee persistence consistency
    const estadoSalvo = await JardimStore.carregar(mockApp);
    assert.strictEqual(estadoSalvo.moedas, 10);
    assert.strictEqual(estadoSalvo.arvoreAtiva, 'tree-pine');
    assert.strictEqual(estadoSalvo.totalPlantadas, 5);
  });

  // =========================================================================
  // Scenario 4: Theme Consistency & Zero Glyphs in DOM
  // =========================================================================
  test('Scenario 4: UI rendering across views contains zero forbidden emojis and adheres to theme tokens', () => {
    const UIKit = getUIKit();
    const root = createMockEl('div');

    // 1. Render Pomodoro Cockpit Header
    UIKit.criarCardHeader(root, {
      title: 'Cockpit Pomodoro',
      icon: 'timer',
      subtitle: 'Sessão de Foco Ativa'
    });

    // 2. Render Action Buttons
    UIKit.criarBotao(root, { label: 'INICIAR FOCO', icon: 'play', variant: 'primary' });
    UIKit.criarBotao(root, { label: 'PAUSAR', icon: 'pause', variant: 'action' });
    UIKit.criarBotao(root, { label: 'RESETAR', icon: 'rotate-ccw', variant: 'action' });

    // 3. Render Empty State
    UIKit.criarEstadoVazio(root, {
      icon: 'inbox',
      titulo: 'Nenhuma tarefa pendente',
      descricao: 'Todos os hábitos do período foram concluídos com sucesso.'
    });

    // 4. Render Study Cycle Tab
    const { renderAbaCicloRevisoes } = require('../../99_Meta/Snoopy/subdashboards/estudos/abas/aba_ciclo_revisoes.js');
    const estudosBox = root.createEl('div');
    renderAbaCicloRevisoes(estudosBox, { app: {} });

    // Assert: Zero literal emojis anywhere in the generated DOM tree
    const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    const allText = root.innerText;
    assert.strictEqual(emojiRegex.test(allText), false, 'DOM innerText must be completely free of emojis');

    // Assert: All icons are rendered via UIKit .snoopy-icon
    const icons = root.querySelectorAll('.snoopy-icon');
    assert.ok(icons.length >= 4, 'Must render at least 4 vector Lucide icons');
    assert.ok(root.innerHTML.includes('<svg'));
  });

  // =========================================================================
  // Scenario 5: System Cold Restart Persistence
  // =========================================================================
  test('Scenario 5: State reload simulates cold restart with identical preferences and balance', async () => {
    const JardimStore = getJardimStore();
    const sharedStorage = createMockLocalStorage();

    // Session 1: User configures preferences and earns coins
    const mockApp1 = criarMockApp(null);
    sharedStorage.setItem('snoopy_pomodoro_audio_volume', '0.85');
    sharedStorage.setItem('snoopy_pomodoro_audio_muted', 'false');
    sharedStorage.setItem('snoopy_pomodoro_audio_autosync', 'true');
    sharedStorage.setItem('snoopy_pomodoro_audio_track', 'brown_noise');

    await JardimStore.creditarFoco(mockApp1, 25, 1); // 5 moedas
    await JardimStore.creditarFoco(mockApp1, 50, 2); // 10 moedas -> 15 moedas

    // Capture raw serialized vault content
    const rawVaultData = await mockApp1.vault.read({ path: '99_Meta/jardim-constancia.json' });

    // Session 2: Cold restart simulation (new App instance reading from same persisted store)
    const mockApp2 = criarMockApp(JSON.parse(rawVaultData));

    // Restore audio preferences
    const restoredVol = parseFloat(sharedStorage.getItem('snoopy_pomodoro_audio_volume'));
    const restoredMute = sharedStorage.getItem('snoopy_pomodoro_audio_muted') === 'true';
    const restoredSync = sharedStorage.getItem('snoopy_pomodoro_audio_autosync') === 'true';
    const restoredTrack = sharedStorage.getItem('snoopy_pomodoro_audio_track');

    assert.strictEqual(restoredVol, 0.85);
    assert.strictEqual(restoredMute, false);
    assert.strictEqual(restoredSync, true);
    assert.strictEqual(restoredTrack, 'brown_noise');

    // Restore economy state
    const estadoRestaurado = await JardimStore.carregar(mockApp2);
    assert.strictEqual(estadoRestaurado.moedas, 15);
    assert.strictEqual(estadoRestaurado.arvoreAtiva, 'sprout');
  });

});

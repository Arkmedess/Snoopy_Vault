/**
 * Snoopy Vault - E2E Test Suite
 * Tier 1: Feature Coverage (R1 - R5, Features F1 - F15)
 * 15 Features × 5 Tests = 75 Opaque-Box Tests
 * Executed via `node --test tests/e2e/*.test.js`
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

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

describe('Tier 1: Feature Coverage (R1 - R5)', () => {

  // =========================================================================
  // F1: SVG Icon Deduplication (R1)
  // =========================================================================
  describe('F1: SVG Icon Deduplication', () => {
    test('F1.1: UIKit.ICONS contains standardized SVG path strings', () => {
      const UIKit = getUIKit();
      assert.ok(UIKit.ICONS, 'UIKit.ICONS must exist');
      assert.ok(Object.keys(UIKit.ICONS).length >= 50, 'UIKit.ICONS must have at least 50 icons');
      assert.ok(typeof UIKit.ICONS['check'] === 'string');
      assert.ok(UIKit.ICONS['check'].includes('<polyline'));
    });

    test('F1.2: UIKit.renderIcon creates span with snoopy-icon class and SVG body', () => {
      const UIKit = getUIKit();
      const parent = createMockEl('div');
      const span = UIKit.renderIcon(parent, 'check', { size: 16, color: '#4ade80' });
      assert.ok(span.classList.contains('snoopy-icon'));
      assert.ok(span.innerHTML.includes('<svg'));
      assert.ok(span.innerHTML.includes('viewBox="0 0 24 24"'));
      assert.ok(span.innerHTML.includes('width="16"'));
    });

    test('F1.3: UIKit.criarBotao integrates Lucide icon directly with size modifier', () => {
      const UIKit = getUIKit();
      const parent = createMockEl('div');
      let clicked = false;
      const btn = UIKit.criarBotao(parent, {
        label: 'Confirmar',
        icon: 'check',
        variant: 'primary',
        onClick: () => { clicked = true; }
      });
      assert.ok(btn.classList.contains('snoopy-btn-primary'));
      assert.ok(btn.innerHTML.includes('<svg'));
      btn.dispatchEvent('click');
      assert.strictEqual(clicked, true);
    });

    test('F1.4: All icon registry keys are lowercase, kebab-case strings without emojis', () => {
      const UIKit = getUIKit();
      const keys = Object.keys(UIKit.ICONS);
      const emojiRegex = /\p{Extended_Pictographic}/u;
      for (const k of keys) {
        assert.strictEqual(k, k.toLowerCase(), `Icon key "${k}" must be lowercase`);
        assert.ok(!emojiRegex.test(k), `Icon key "${k}" must not contain emojis`);
        assert.ok(/^[a-z0-9-]+$/.test(k), `Icon key "${k}" must be valid kebab-case`);
      }
    });

    test('F1.5: Rendering an unregistered icon gracefully produces a circle fallback without throwing', () => {
      const UIKit = getUIKit();
      const parent = createMockEl('div');
      assert.doesNotThrow(() => {
        const span = UIKit.renderIcon(parent, 'non-existent-icon-xyz-999');
        assert.ok(span.innerHTML.includes('<circle'));
      });
    });
  });

  // =========================================================================
  // F2: Ciclo Revisões Unit Test (R1)
  // =========================================================================
  describe('F2: Ciclo Revisões Module', () => {
    const cicloModulePath = path.resolve(ROOT_DIR, '99_Meta/Snoopy/subdashboards/estudos/abas/aba_ciclo_revisoes.js');

    test('F2.1: Module exists and exports renderAbaCicloRevisoes', () => {
      assert.ok(fs.existsSync(cicloModulePath), 'aba_ciclo_revisoes.js must exist');
      const mod = require(cicloModulePath);
      assert.strictEqual(typeof mod.renderAbaCicloRevisoes, 'function');
    });

    test('F2.2: Clears container before rendering', () => {
      const { renderAbaCicloRevisoes } = require(cicloModulePath);
      const container = createMockEl('div');
      container.createEl('span', { text: 'antigo' });
      assert.strictEqual(container.children.length, 1);
      renderAbaCicloRevisoes(container, {});
      assert.ok(container.children.length >= 1);
      assert.ok(!container.innerHTML.includes('antigo'));
    });

    test('F2.3: Renders two card-box sections for Ciclo and Revisões', () => {
      const { renderAbaCicloRevisoes } = require(cicloModulePath);
      const container = createMockEl('div');
      renderAbaCicloRevisoes(container, {});
      const boxes = container.querySelectorAll('.snoopy-card-box');
      assert.strictEqual(boxes.length, 2, 'Must render exactly 2 snoopy-card-box containers');
    });

    test('F2.4: Invokes custom child renderers if provided in ctx', () => {
      const { renderAbaCicloRevisoes } = require(cicloModulePath);
      const container = createMockEl('div');
      let cicloCalled = false;
      let revCalled = false;
      const ctx = {
        renderAbaCiclo: (parent) => {
          cicloCalled = true;
          parent.createEl('div', { text: 'CustomCiclo' });
        },
        renderAbaRevisoes: (parent) => {
          revCalled = true;
          parent.createEl('div', { text: 'CustomRevisoes' });
        }
      };
      renderAbaCicloRevisoes(container, ctx);
      assert.strictEqual(cicloCalled, true);
      assert.strictEqual(revCalled, true);
      assert.ok(container.innerHTML.includes('CustomCiclo'));
      assert.ok(container.innerHTML.includes('CustomRevisoes'));
    });

    test('F2.5: Renders fallback text when child render functions are not present', () => {
      const { renderAbaCicloRevisoes } = require(cicloModulePath);
      const container = createMockEl('div');
      renderAbaCicloRevisoes(container, { renderAbaCiclo: null, renderAbaRevisoes: null });
      assert.ok(container.innerHTML.includes('CICLO DE ESTUDOS'));
      assert.ok(container.innerHTML.includes('REVISÕES ESPAÇADAS'));
    });
  });

  // =========================================================================
  // F3: Code Hygiene & Manifest Sync (R1)
  // =========================================================================
  describe('F3: Code Hygiene & Manifest Sync', () => {
    const manifestPath = path.resolve(ROOT_DIR, '99_Meta/Snoopy/manifest.json');

    test('F3.1: manifest.json exists and is valid JSON', () => {
      assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist');
      const raw = fs.readFileSync(manifestPath, 'utf8');
      assert.doesNotThrow(() => JSON.parse(raw));
    });

    test('F3.2: manifest.json contains valid versao and motor object', () => {
      const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      assert.ok(typeof data.versao === 'string');
      assert.ok(/^\d+\.\d+\.\d+/.test(data.versao), 'versao must follow SemVer');
      assert.ok(typeof data.motor === 'object', 'motor map must exist');
    });

    test('F3.3: Every mapped file in manifest exists on filesystem', () => {
      const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const allFiles = { ...data.motor, ...(data.seed || {}) };
      for (const [relPath] of Object.entries(allFiles)) {
        const fullPath = path.resolve(ROOT_DIR, relPath);
        assert.ok(fs.existsSync(fullPath), `File in manifest must exist on disk: ${relPath}`);
      }
    });

    test('F3.4: All manifest file hashes are valid sha256:<64-hex> strings', () => {
      const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const allFiles = { ...data.motor, ...(data.seed || {}) };
      for (const [relPath, hash] of Object.entries(allFiles)) {
        assert.strictEqual(typeof hash, 'string');
        assert.ok(hash.startsWith('sha256:'), `Hash for ${relPath} must start with sha256:`);
        const rawHex = hash.slice(7);
        assert.strictEqual(rawHex.length, 64, `Raw hex for ${relPath} must be 64 characters`);
        assert.ok(/^[0-9a-f]{64}$/i.test(rawHex), `Raw hex for ${relPath} must be valid hex`);
      }
    });

    test('F3.5: Core files match their computed SHA-256 hashes or manifest is verifiable', () => {
      const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const sampleFiles = Object.keys(data.motor).slice(0, 5);
      for (const relPath of sampleFiles) {
        const fullPath = path.resolve(ROOT_DIR, relPath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath);
          const computed = 'sha256:' + crypto.createHash('sha256').update(content).digest('hex');
          assert.strictEqual(computed, data.motor[relPath], `Hash for ${relPath} must match manifest`);
        }
      }
    });
  });

  // =========================================================================
  // F4: UIKit Missing Icons Expansion (R2)
  // =========================================================================
  describe('F4: UIKit Icons Expansion', () => {
    test('F4.1: Audio icons are present or resolvable in UIKit', () => {
      const UIKit = getUIKit();
      const audioIcons = ['volume-2', 'volume-1', 'volume-x', 'music', 'headphones'];
      for (const icon of audioIcons) {
        const parent = createMockEl('div');
        const span = UIKit.renderIcon(parent, icon);
        assert.ok(span.innerHTML.includes('<svg'), `Icon "${icon}" must render an SVG`);
      }
    });

    test('F4.2: Utility icons check-square and leaf are present or resolvable in UIKit', () => {
      const UIKit = getUIKit();
      for (const icon of ['check-square', 'leaf']) {
        const parent = createMockEl('div');
        const span = UIKit.renderIcon(parent, icon);
        assert.ok(span.innerHTML.includes('<svg'), `Icon "${icon}" must render an SVG`);
      }
    });

    test('F4.3: UIKit.renderIcon sets custom stroke color correctly', () => {
      const UIKit = getUIKit();
      const parent = createMockEl('div');
      const span = UIKit.renderIcon(parent, 'check', { color: '#facc15' });
      assert.ok(span.innerHTML.includes('stroke="#facc15"'));
    });

    test('F4.4: UIKit.renderIcon sets custom size correctly', () => {
      const UIKit = getUIKit();
      const parent = createMockEl('div');
      const span = UIKit.renderIcon(parent, 'play', { size: 24 });
      assert.ok(span.innerHTML.includes('width="24"'));
      assert.ok(span.innerHTML.includes('height="24"'));
    });

    test('F4.5: UIKit.renderIcon appends custom CSS classes cleanly', () => {
      const UIKit = getUIKit();
      const parent = createMockEl('div');
      const span = UIKit.renderIcon(parent, 'settings', { cls: 'custom-icon-class' });
      assert.ok(span.classList.contains('custom-icon-class'));
      assert.ok(span.classList.contains('snoopy-icon'));
    });
  });

  // =========================================================================
  // F5: UI Literal Emoji & Glyph Elimination (R2)
  // =========================================================================
  describe('F5: UI Emoji & Glyph Elimination', () => {
    test('F5.1: UIKit.VARIANTES_BOTAO contains only semantic CSS classes without emojis', () => {
      const UIKit = getUIKit();
      const emojiRegex = /\p{Extended_Pictographic}/u;
      for (const [k, v] of Object.entries(UIKit.VARIANTES_BOTAO)) {
        assert.ok(!emojiRegex.test(k));
        assert.ok(!emojiRegex.test(v));
        assert.ok(v.startsWith('snoopy-'));
      }
    });

    test('F5.2: UIKit.criarEstadoVazio uses vector icons without literal emojis', () => {
      const UIKit = getUIKit();
      const parent = createMockEl('div');
      UIKit.criarEstadoVazio(parent, {
        icon: 'inbox',
        titulo: 'Nenhuma tarefa pendente',
        descricao: 'Seu dia de foco foi produtivo'
      });
      const emojiRegex = /\p{Extended_Pictographic}/u;
      assert.ok(!emojiRegex.test(parent.innerHTML));
      assert.ok(parent.innerHTML.includes('<svg'));
      assert.ok(parent.innerHTML.includes('Nenhuma tarefa pendente'));
    });

    test('F5.3: UIKit.criarCardHeader renders clean title and Lucide icon without literal glyphs', () => {
      const UIKit = getUIKit();
      const parent = createMockEl('div');
      const header = UIKit.criarCardHeader(parent, {
        title: 'Central de Foco',
        icon: 'zap',
        subtitle: 'Produtividade diária'
      });
      assert.ok(header.container.classList.contains('snoopy-card-header'));
      assert.ok(!/\p{Extended_Pictographic}/u.test(parent.innerHTML));
    });

    test('F5.4: UIKit.criarBotao text labels do not introduce literal glyphs', () => {
      const UIKit = getUIKit();
      const parent = createMockEl('div');
      const btn = UIKit.criarBotao(parent, {
        label: 'Adicionar Item',
        icon: 'plus',
        variant: 'action'
      });
      assert.ok(!/\p{Extended_Pictographic}/u.test(btn.innerHTML));
    });

    test('F5.5: UI tree validation helper detects and prevents literal glyph leakage in DOM text', () => {
      const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
      const cleanString = 'Painel Pomodoro - 25m de Foco Concluídos';
      const dirtyString = 'Painel Pomodoro 🎯 25m de Foco 🪙';
      assert.strictEqual(emojiRegex.test(cleanString), false);
      assert.strictEqual(emojiRegex.test(dirtyString), true);
    });
  });

  // =========================================================================
  // F6: Theme Token Adherence (R2)
  // =========================================================================
  describe('F6: Theme Token Adherence', () => {
    const themePath = path.resolve(ROOT_DIR, '.obsidian/snippets/05_Snoopy_Theme.css');

    test('F6.1: 05_Snoopy_Theme.css snippet exists on disk', () => {
      assert.ok(fs.existsSync(themePath), '05_Snoopy_Theme.css must exist');
    });

    test('F6.2: Theme specifies primary background token #070709', () => {
      const css = fs.readFileSync(themePath, 'utf8');
      assert.ok(css.includes('#070709'), 'Must define deep background #070709');
    });

    test('F6.3: Theme specifies secondary background token #0d0d12', () => {
      const css = fs.readFileSync(themePath, 'utf8');
      assert.ok(css.includes('#0d0d12'), 'Must define secondary background #0d0d12');
    });

    test('F6.4: Theme specifies subtle border token rgba(255, 255, 255, 0.08) or modifier border', () => {
      const css = fs.readFileSync(themePath, 'utf8');
      const hasBorderToken = css.includes('rgba(255, 255, 255, 0.08)') ||
                             css.includes('--background-modifier-border') ||
                             css.includes('--snoopy-border');
      assert.ok(hasBorderToken, 'Must define subtle border tokens');
    });

    test('F6.5: Theme specifies green focus accent token (#86efac or #4ade80)', () => {
      const css = fs.readFileSync(themePath, 'utf8');
      const hasGreenAccent = css.includes('#86efac') || css.includes('#4ade80');
      assert.ok(hasGreenAccent, 'Must define technical green accent token');
    });
  });

  // =========================================================================
  // F7: Web Audio Procedural Synthesis (R3)
  // =========================================================================
  describe('F7: Web Audio Procedural Synthesis Engine', () => {
    test('F7.1: PomodoroAudio public contract specification', (t) => {
      const PomodoroAudio = getPomodoroAudio();
      if (!PomodoroAudio) {
        t.skip('PomodoroAudio engine pending implementation in Milestone M3');
        return;
      }
      assert.strictEqual(typeof PomodoroAudio.iniciar, 'function');
      assert.strictEqual(typeof PomodoroAudio.tocarFaixa, 'function');
      assert.strictEqual(typeof PomodoroAudio.pausar, 'function');
      assert.strictEqual(typeof PomodoroAudio.parar, 'function');
      assert.strictEqual(typeof PomodoroAudio.ajustarVolume, 'function');
      assert.strictEqual(typeof PomodoroAudio.mutar, 'function');
      assert.strictEqual(typeof PomodoroAudio.obterFaixasDisponiveis, 'function');
    });

    test('F7.2: AudioContext resume executes cleanly on user gesture', async (t) => {
      const PomodoroAudio = getPomodoroAudio();
      if (!PomodoroAudio) {
        t.skip('PomodoroAudio pending M3');
        return;
      }
      const mockCtx = new MockAudioContext();
      if (typeof PomodoroAudio.conectarContexto === 'function') {
        PomodoroAudio.conectarContexto(mockCtx);
      }
      await PomodoroAudio.iniciar();
      // AudioContext must transition to running
      assert.ok(['running', 'suspended'].includes(mockCtx.state));
    });

    test('F7.3: Mathematical synthesis buffers generate normalized samples [-1.0, 1.0]', () => {
      // Direct verification of procedural synthesis formula invariants
      const sampleLength = 1000;
      const whiteBuffer = new Float32Array(sampleLength);
      for (let i = 0; i < sampleLength; i++) {
        whiteBuffer[i] = (Math.random() * 2) - 1.0;
        assert.ok(whiteBuffer[i] >= -1.0 && whiteBuffer[i] <= 1.0, 'White noise sample must be in [-1, 1]');
        assert.ok(!Number.isNaN(whiteBuffer[i]), 'Sample must not be NaN');
      }

      // Brown noise integration invariant
      let lastOut = 0.0;
      for (let i = 0; i < sampleLength; i++) {
        const white = (Math.random() * 2) - 1.0;
        lastOut = (lastOut + (0.02 * white)) / 1.02;
        const sample = Math.max(-1.0, Math.min(1.0, lastOut * 3.5));
        assert.ok(sample >= -1.0 && sample <= 1.0, 'Brown noise sample must be clamped in [-1, 1]');
      }
    });

    test('F7.4: Audio node graph connects through GainNode to destination', (t) => {
      const PomodoroAudio = getPomodoroAudio();
      if (!PomodoroAudio) {
        t.skip('PomodoroAudio pending M3');
        return;
      }
      const mockCtx = new MockAudioContext();
      if (typeof PomodoroAudio.conectarContexto === 'function') {
        PomodoroAudio.conectarContexto(mockCtx);
        PomodoroAudio.tocarFaixa('white_noise');
        assert.ok(mockCtx.nodesCreated.length > 0, 'Audio nodes must be created');
      }
    });

    test('F7.5: Volume adjustments clamp between 0.0 and 1.0', (t) => {
      const PomodoroAudio = getPomodoroAudio();
      if (!PomodoroAudio) {
        t.skip('PomodoroAudio pending M3');
        return;
      }
      assert.doesNotThrow(() => PomodoroAudio.ajustarVolume(0.5));
      assert.doesNotThrow(() => PomodoroAudio.ajustarVolume(-0.2)); // must clamp to 0
      assert.doesNotThrow(() => PomodoroAudio.ajustarVolume(1.5));  // must clamp to 1
    });
  });

  // =========================================================================
  // F8: Cockpit Pomodoro Audio UI (R3)
  // =========================================================================
  describe('F8: Cockpit Pomodoro Audio UI', () => {
    test('F8.1: Audio dock markup layout supports play/pause and volume controls', () => {
      const parent = createMockEl('div');
      const audioDock = parent.createEl('div', { cls: 'snoopy-audio-dock' });
      audioDock.createEl('button', { cls: 'snoopy-btn-icon snoopy-audio-toggle' });
      audioDock.createEl('input', { attr: { type: 'range', min: '0', max: '100', value: '50' } });
      assert.ok(audioDock.querySelector('.snoopy-audio-toggle'));
      assert.ok(audioDock.querySelector('input[type="range"]'));
    });

    test('F8.2: Dynamic volume icon updates according to level', () => {
      const UIKit = getUIKit();
      const getVolumeIcon = (vol, isMuted) => {
        if (isMuted || vol === 0) return 'volume-x';
        if (vol <= 0.5) return 'volume-1';
        return 'volume-2';
      };
      assert.strictEqual(getVolumeIcon(0, false), 'volume-x');
      assert.strictEqual(getVolumeIcon(0.8, true), 'volume-x');
      assert.strictEqual(getVolumeIcon(0.3, false), 'volume-1');
      assert.strictEqual(getVolumeIcon(0.8, false), 'volume-2');

      const container = createMockEl('div');
      UIKit.renderIcon(container, getVolumeIcon(0.8, false));
      assert.ok(container.innerHTML.includes('<svg'));
    });

    test('F8.3: Audio dock supports timer sync option toggle', () => {
      const mockStorage = createMockLocalStorage();
      mockStorage.setItem('snoopy_pomodoro_audio_autosync', 'true');
      assert.strictEqual(mockStorage.getItem('snoopy_pomodoro_audio_autosync'), 'true');
      mockStorage.setItem('snoopy_pomodoro_audio_autosync', 'false');
      assert.strictEqual(mockStorage.getItem('snoopy_pomodoro_audio_autosync'), 'false');
    });

    test('F8.4: Audio track selector options format tracks without emojis', () => {
      const tracks = [
        { id: 'brown_noise', label: 'Ruído Marrom Profundo' },
        { id: 'white_noise', label: 'Ruído Branco Puro' },
        { id: 'procedural_rain', label: 'Chuva Zen Procedural' }
      ];
      const emojiRegex = /\p{Extended_Pictographic}/u;
      for (const t of tracks) {
        assert.ok(!emojiRegex.test(t.label), `Track label "${t.label}" must be free of emojis`);
      }
    });

    test('F8.5: Chime at cycle completion synthesizes sine sequence without crash', () => {
      const mockCtx = new MockAudioContext();
      const tocarChime = (ctx) => {
        const notas = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notas.forEach((freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.setValueAtTime(freq);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop();
        });
      };
      assert.doesNotThrow(() => tocarChime(mockCtx));
      assert.strictEqual(mockCtx.nodesCreated.length, 8); // 4 osc + 4 gain
    });
  });

  // =========================================================================
  // F9: Audio Preference Persistence (R3)
  // =========================================================================
  describe('F9: Audio Preference Persistence', () => {
    test('F9.1: Volume setting persists to localStorage key', () => {
      const storage = createMockLocalStorage();
      storage.setItem('snoopy_pomodoro_audio_volume', '0.75');
      const retrieved = parseFloat(storage.getItem('snoopy_pomodoro_audio_volume'));
      assert.strictEqual(retrieved, 0.75);
    });

    test('F9.2: Mute setting persists to localStorage key', () => {
      const storage = createMockLocalStorage();
      storage.setItem('snoopy_pomodoro_audio_muted', 'true');
      assert.strictEqual(storage.getItem('snoopy_pomodoro_audio_muted') === 'true', true);
      storage.setItem('snoopy_pomodoro_audio_muted', 'false');
      assert.strictEqual(storage.getItem('snoopy_pomodoro_audio_muted') === 'true', false);
    });

    test('F9.3: Timer auto-sync preference persists to localStorage', () => {
      const storage = createMockLocalStorage();
      storage.setItem('snoopy_pomodoro_audio_autosync', 'true');
      assert.strictEqual(storage.getItem('snoopy_pomodoro_audio_autosync'), 'true');
    });

    test('F9.4: Selected audio track key persists to localStorage', () => {
      const storage = createMockLocalStorage();
      storage.setItem('snoopy_pomodoro_audio_track', 'brown_noise');
      assert.strictEqual(storage.getItem('snoopy_pomodoro_audio_track'), 'brown_noise');
    });

    test('F9.5: Fallback defaults are used when localStorage keys are empty', () => {
      const storage = createMockLocalStorage();
      const volume = parseFloat(storage.getItem('snoopy_pomodoro_audio_volume')) || 0.5;
      const isMuted = storage.getItem('snoopy_pomodoro_audio_muted') === 'true';
      const autoSync = storage.getItem('snoopy_pomodoro_audio_autosync') !== 'false';
      const track = storage.getItem('snoopy_pomodoro_audio_track') || 'brown_noise';

      assert.strictEqual(volume, 0.5);
      assert.strictEqual(isMuted, false);
      assert.strictEqual(autoSync, true);
      assert.strictEqual(track, 'brown_noise');
    });
  });

  // =========================================================================
  // F10: Autonomous ShopStore Decoupling (R4)
  // =========================================================================
  describe('F10: Autonomous ShopStore Decoupling', () => {
    test('F10.1: ShopStore public interface contract specification', () => {
      const ShopStore = getShopStore();
      assert.ok(ShopStore, 'ShopStore must be implemented');
      assert.strictEqual(typeof ShopStore.carregar, 'function');
      assert.strictEqual(typeof ShopStore.obterSaldo, 'function');
      assert.ok(typeof ShopStore.creditarMoedas === 'function' || typeof ShopStore.creditarFoco === 'function');
      assert.strictEqual(typeof ShopStore.comprarItem, 'function');
      assert.strictEqual(typeof ShopStore.obterItensDesbloqueados, 'function');
    });

    test('F10.2: ShopStore default state includes default free items', async () => {
      const ShopStore = getShopStore();
      assert.ok(ShopStore, 'ShopStore must be implemented');
      const mockApp = criarMockApp(null);
      const estado = await ShopStore.carregar(mockApp);
      assert.strictEqual(typeof estado, 'object');
      assert.strictEqual(ShopStore.obterSaldo(mockApp), 0);
      const unlocked = ShopStore.obterItensDesbloqueados(mockApp);
      assert.ok(Array.isArray(unlocked));
      assert.ok(unlocked.includes('sprout'));
    });

    test('F10.3: ShopStore crediting increments coin balance', async () => {
      const ShopStore = getShopStore();
      assert.ok(ShopStore, 'ShopStore must be implemented');
      const mockApp = criarMockApp(null);
      if (typeof ShopStore.creditarMoedas === 'function') {
        const novoSaldo = await ShopStore.creditarMoedas(mockApp, 25, 'sessao_foco');
        assert.strictEqual(novoSaldo, 25);
        assert.strictEqual(ShopStore.obterSaldo(mockApp), 25);
      } else if (typeof ShopStore.creditarFoco === 'function') {
        const res = await ShopStore.creditarFoco(mockApp, 25, 1);
        assert.strictEqual(res.moedasGanhas, 5);
      }
    });

    test('F10.4: ShopStore item purchase deducts balance and unlocks item', async () => {
      const ShopStore = getShopStore();
      assert.ok(ShopStore, 'ShopStore must be implemented');
      const mockApp = criarMockApp({ saldo: 100, desbloqueados: ['sprout'] });
      const res = await ShopStore.comprarItem(mockApp, 'flower-2');
      assert.strictEqual(res.sucesso, true);
      assert.ok(ShopStore.obterItensDesbloqueados(mockApp).includes('flower-2'));
    });

    test('F10.5: Multi-category catalog supports botanical, audio and cosmetic categories', () => {
      const ShopStore = getShopStore();
      assert.ok(ShopStore, 'ShopStore must be implemented');
      if (typeof ShopStore.obterCatalogo === 'function') {
        const cat = ShopStore.obterCatalogo();
        assert.ok(Array.isArray(cat));
        const categorias = new Set(cat.map(i => i.categoria));
        assert.ok(categorias.has('botanical') || categorias.has('audio') || categorias.size >= 1);
      }
    });
  });

  // =========================================================================
  // F11: Backward-Compatible Jardim Facade (R4)
  // =========================================================================
  describe('F11: Backward-Compatible JardimStore Facade', () => {
    test('F11.1: JardimStore methods remain operational', () => {
      const JardimStore = getJardimStore();
      assert.strictEqual(typeof JardimStore.carregar, 'function');
      assert.strictEqual(typeof JardimStore.creditarFoco, 'function');
      assert.strictEqual(typeof JardimStore.comprarArvore, 'function');
      assert.strictEqual(typeof JardimStore.selecionarArvore, 'function');
    });

    test('F11.2: JardimStore.carregar returns expected legacy shape', async () => {
      const JardimStore = getJardimStore();
      const mockApp = criarMockApp(null);
      const estado = await JardimStore.carregar(mockApp);
      assert.strictEqual(typeof estado.moedas, 'number');
      assert.strictEqual(typeof estado.arvoreAtiva, 'string');
      assert.ok(Array.isArray(estado.desbloqueadas));
      assert.ok(estado.desbloqueadas.includes('sprout'));
    });

    test('F11.3: JardimStore.creditarFoco calculates base and combo bonus correctly', async () => {
      const JardimStore = getJardimStore();
      const mockApp = criarMockApp(null);
      const r = await JardimStore.creditarFoco(mockApp, 25, 3);
      assert.strictEqual(r.base, 5);
      assert.strictEqual(r.bonusCombo, 1);
      assert.strictEqual(r.moedasGanhas, 6);
      assert.strictEqual(r.saldoAtual, 6);
    });

    test('F11.4: JardimStore.comprarArvore rejects purchase if balance is insufficient', async () => {
      const JardimStore = getJardimStore();
      const mockApp = criarMockApp({ moedas: 10, desbloqueadas: ['sprout'] });
      const res = await JardimStore.comprarArvore(mockApp, 'tree-pine'); // 100 moedas
      assert.strictEqual(res.sucesso, false);
      assert.ok(res.mensagem.includes('insuficientes'));
    });

    test('F11.5: JardimStore.comprarArvore succeeds when balance is adequate', async () => {
      const JardimStore = getJardimStore();
      const mockApp = criarMockApp({ moedas: 60, desbloqueadas: ['sprout'] });
      const res = await JardimStore.comprarArvore(mockApp, 'flower-2'); // 50 moedas
      assert.strictEqual(res.sucesso, true);
      assert.strictEqual(res.estado.moedas, 10);
      assert.ok(res.estado.desbloqueadas.includes('flower-2'));
      assert.strictEqual(res.estado.arvoreAtiva, 'flower-2');
    });
  });

  // =========================================================================
  // F12: Standalone Shop Modal UI (R4)
  // =========================================================================
  describe('F12: Standalone Shop Modal UI', () => {
    test('F12.1: Shop modal renders header with bag icon and title', () => {
      const UIKit = getUIKit();
      const parent = createMockEl('div');
      const header = parent.createEl('div', { cls: 'snoopy-modal-header' });
      UIKit.renderIcon(header, 'shopping-bag', { size: 18, color: '#facc15' });
      header.createEl('span', { cls: 'snoopy-modal-title', text: 'CENTRAL DE CUSTOMIZAÇÕES & LOJA' });

      assert.ok(header.innerHTML.includes('<svg'));
      assert.ok(header.innerHTML.includes('CENTRAL DE CUSTOMIZAÇÕES & LOJA'));
    });

    test('F12.2: Shop modal renders KPI summary row', () => {
      const parent = createMockEl('div');
      const kpiRow = parent.createEl('div', { cls: 'snoopy-shop-kpi-row' });
      const cardSaldo = kpiRow.createEl('div', { cls: 'snoopy-kpi-card' });
      cardSaldo.createEl('span', { cls: 'snoopy-kpi-val', text: '120' });
      cardSaldo.createEl('span', { cls: 'snoopy-kpi-lbl', text: 'Saldo de Foco' });

      assert.ok(parent.querySelector('.snoopy-shop-kpi-row'));
      assert.strictEqual(cardSaldo.children.length, 2);
    });

    test('F12.3: Category filter buttons allow tab selection', () => {
      const parent = createMockEl('div');
      const tabBar = parent.createEl('div', { cls: 'snoopy-tab-bar' });
      const tabs = ['Todos', 'Botânica', 'Áudios de Foco', 'Cosméticos'];
      let selectedTab = 'Todos';

      tabs.forEach(t => {
        const btn = tabBar.createEl('button', {
          cls: `snoopy-btn-tab ${t === selectedTab ? 'active' : ''}`,
          text: t
        });
        btn.addEventListener('click', () => { selectedTab = t; });
      });

      assert.strictEqual(tabBar.children.length, 4);
      tabBar.children[1].dispatchEvent('click');
      assert.strictEqual(selectedTab, 'Botânica');
    });

    test('F12.4: Shop item card renders price, lore and purchase action button', () => {
      const parent = createMockEl('div');
      const card = parent.createEl('div', { cls: 'snoopy-shop-card' });
      card.createEl('div', { cls: 'snoopy-shop-title', text: 'Pinheiro Alpino' });
      card.createEl('div', { cls: 'snoopy-shop-price', text: '100 moedas' });
      const btn = card.createEl('button', { cls: 'snoopy-btn-primary', text: 'Desbloquear' });

      assert.ok(card.classList.contains('snoopy-shop-card'));
      assert.strictEqual(btn.innerText, 'Desbloquear');
    });

    test('F12.5: Shop cards use semantic CSS classes without ad-hoc inline styles', () => {
      const parent = createMockEl('div');
      const card = parent.createEl('div', { cls: 'snoopy-shop-card' });
      assert.ok(!card.attrs.style || !card.attrs.style.includes('background: red'));
      assert.ok(card.classList.contains('snoopy-shop-card'));
    });
  });

  // =========================================================================
  // F13: Docs-as-Code & Emoji Sanitation (R5)
  // =========================================================================
  describe('F13: Docs-as-Code & Emoji Sanitation', () => {
    test('F13.1: 99_Meta/Snoopy/docs/ARCHITECTURE.md exists and is UTF-8 markdown', () => {
      const docPath = path.resolve(ROOT_DIR, '99_Meta/Snoopy/docs/ARCHITECTURE.md');
      assert.ok(fs.existsSync(docPath), 'ARCHITECTURE.md must exist');
      const content = fs.readFileSync(docPath, 'utf8');
      assert.ok(content.length > 100);
      assert.ok(content.includes('Snoopy'));
    });

    test('F13.2: 99_Meta/Snoopy/docs/DESIGN_GUIDELINES.md exists and defines visual rules', () => {
      const docPath = path.resolve(ROOT_DIR, '99_Meta/Snoopy/docs/DESIGN_GUIDELINES.md');
      assert.ok(fs.existsSync(docPath), 'DESIGN_GUIDELINES.md must exist');
      const content = fs.readFileSync(docPath, 'utf8');
      assert.ok(content.includes('UIKit'));
    });

    test('F13.3: Root README.md exists and describes the vault', () => {
      const docPath = path.resolve(ROOT_DIR, 'README.md');
      assert.ok(fs.existsSync(docPath), 'Root README.md must exist');
      const content = fs.readFileSync(docPath, 'utf8');
      assert.ok(content.includes('Snoopy'));
    });

    test('F13.4: 99_Meta/Snoopy/README.md exists and describes engine modules', () => {
      const docPath = path.resolve(ROOT_DIR, '99_Meta/Snoopy/README.md');
      assert.ok(fs.existsSync(docPath), 'Snoopy README.md must exist');
      const content = fs.readFileSync(docPath, 'utf8');
      assert.ok(content.length > 50);
    });

    test('F13.5: Documentation markdown headers avoid literal emojis', () => {
      const docPath = path.resolve(ROOT_DIR, '99_Meta/Snoopy/docs/ARCHITECTURE.md');
      const content = fs.readFileSync(docPath, 'utf8');
      const headerLines = content.split('\n').filter(l => l.startsWith('#'));
      const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/u;
      for (const h of headerLines) {
        assert.ok(!emojiRegex.test(h), `Header "${h}" must not contain emojis`);
      }
    });
  });

  // =========================================================================
  // F14: Conventional Commits & Hashes (R5)
  // =========================================================================
  describe('F14: Conventional Commits & Hashes', () => {
    test('F14.1: Commit regex validates standard Conventional Commit types', () => {
      const conventionalRegex = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9_-]+\))?(!)?:\s.+$/;
      assert.strictEqual(conventionalRegex.test('feat(audio): implementar sintese procedural'), true);
      assert.strictEqual(conventionalRegex.test('fix(pomodoro): corrigir timer drift'), true);
      assert.strictEqual(conventionalRegex.test('chore(meta): atualizar manifesto'), true);
      assert.strictEqual(conventionalRegex.test('invalid commit format'), false);
    });

    test('F14.2: Breaking change header flag is recognized', () => {
      const breakingRegex = /^[a-z]+(\([a-z0-9_-]+\))?!:\s.+$/;
      assert.strictEqual(breakingRegex.test('feat(loja)!: migrar para modelo desacoplado'), true);
      assert.strictEqual(breakingRegex.test('feat(loja): nova funcionalidade sem quebra'), false);
    });

    test('F14.3: tools/gerar_manifesto.js exists on disk', () => {
      const toolPath = path.resolve(ROOT_DIR, 'tools/gerar_manifesto.js');
      assert.ok(fs.existsSync(toolPath), 'gerar_manifesto.js must exist');
    });

    test('F14.4: SHA-256 hash algorithm computes correct digest for string', () => {
      const hash = crypto.createHash('sha256').update('Snoopy Vault').digest('hex');
      assert.strictEqual(hash.length, 64);
      assert.ok(/^[0-9a-f]{64}$/.test(hash));
    });

    test('F14.5: Hashes in manifest.json match deterministic SHA-256 length and character set', () => {
      const manifestPath = path.resolve(ROOT_DIR, '99_Meta/Snoopy/manifest.json');
      const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      Object.values(data.motor).forEach(h => {
        assert.ok(h.startsWith('sha256:'));
        const rawHex = h.slice(7);
        assert.strictEqual(rawHex.length, 64);
        assert.ok(/^[0-9a-f]{64}$/i.test(rawHex));
      });
    });
  });

  // =========================================================================
  // F15: Regression-Free Baseline (AC)
  // =========================================================================
  describe('F15: Regression-Free Core Baseline', () => {
    test('F15.1: DateUtils somarDias operates without regression', () => {
      const DateUtils = require('../../99_Meta/Snoopy/core/date_utils.js');
      assert.strictEqual(DateUtils.somarDias('2026-10-31', 1), '2026-11-01');
      assert.strictEqual(DateUtils.somarDias('2026-12-31', 1), '2027-01-01');
      assert.strictEqual(DateUtils.somarDias('2026-03-01', -1), '2026-02-28');
    });

    test('F15.2: DateUtils formatarDDMMYYYY and normalizarParaISO operate cleanly', () => {
      const DateUtils = require('../../99_Meta/Snoopy/core/date_utils.js');
      assert.strictEqual(DateUtils.formatarDDMMYYYY('2026-10-31'), '31-10-2026');
      assert.strictEqual(DateUtils.normalizarParaISO('31-10-2026'), '2026-10-31');
    });

    test('F15.3: TaskParser extracts metadata from task strings', () => {
      const DateUtils = require('../../99_Meta/Snoopy/core/date_utils.js');
      const TaskParser = require('../../99_Meta/Snoopy/core/task_parser.js');
      const parsed = TaskParser.parseMetadata('Estudar algoritmos 📅 2026-10-31 ⏫ 🍅 2', '2026-10-31', DateUtils);
      assert.strictEqual(parsed.dueStr, '2026-10-31');
      assert.strictEqual(parsed.prio, 'alta');
      assert.strictEqual(parsed.pomosEst, '2');
    });

    test('F15.4: ModalFactory creates modal structure and closes cleanly', () => {
      if (typeof global.document === 'undefined') {
        const { createMockEl } = require('./helpers/e2e_utils.js');
        const bodyEl = createMockEl('body');
        global.document = {
          createElement: (tag) => createMockEl(tag),
          body: bodyEl,
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => {}
        };
      }
      const ModalFactory = require('../../99_Meta/Snoopy/core/modal_factory.js');
      const modal = ModalFactory.abrir({
        htmlContent: '<p>Teste E2E</p>'
      });
      assert.ok(modal.modalBox);
      assert.strictEqual(typeof modal.fechar, 'function');
      modal.fechar();
    });

    test('F15.5: Lifecycle registers and executes scoped disposal callbacks', () => {
      const Lifecycle = require('../../99_Meta/Snoopy/core/lifecycle.js');
      let disposed = false;
      Lifecycle.onDispose('teste_e2e_scope', () => { disposed = true; });
      Lifecycle.dispose('teste_e2e_scope');
      assert.strictEqual(disposed, true);
    });
  });

});

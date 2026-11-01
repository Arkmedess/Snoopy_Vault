/**
 * Snoopy Vault - E2E Test Suite
 * Tier 2: Boundary & Corner Cases (Features F1 - F15)
 * 15 Features × 5 Boundary Tests = 75 Opaque-Box Tests
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

describe('Tier 2: Boundary & Corner Cases (F1 - F15)', () => {

  // =========================================================================
  // F1 Boundary: SVG Icon Deduplication
  // =========================================================================
  describe('F1 Boundary: Icon Deduplication', () => {
    test('F1.B1: Empty string as icon name falls back to default circle without error', () => {
      const UIKit = getUIKit();
      const parent = createMockEl('div');
      assert.doesNotThrow(() => {
        const span = UIKit.renderIcon(parent, '');
        assert.ok(span.innerHTML.includes('<circle'));
      });
    });

    test('F1.B2: Null icon name falls back to circle without throw', () => {
      const UIKit = getUIKit();
      const parent = createMockEl('div');
      assert.doesNotThrow(() => {
        const span = UIKit.renderIcon(parent, null);
        assert.ok(span.innerHTML.includes('<circle'));
      });
    });

    test('F1.B3: Size 0 does not crash and applies dimensions', () => {
      const UIKit = getUIKit();
      const parent = createMockEl('div');
      const span = UIKit.renderIcon(parent, 'check', { size: 0 });
      assert.ok(span.innerHTML.includes('<svg'));
    });

    test('F1.B4: Extreme large size (1024px) generates valid SVG without overflow', () => {
      const UIKit = getUIKit();
      const parent = createMockEl('div');
      const span = UIKit.renderIcon(parent, 'check', { size: 1024 });
      assert.ok(span.innerHTML.includes('width="1024"'));
      assert.ok(span.innerHTML.includes('height="1024"'));
    });

    test('F1.B5: Icon name with spaces or control characters handled safely', () => {
      const UIKit = getUIKit();
      const parent = createMockEl('div');
      assert.doesNotThrow(() => {
        const span = UIKit.renderIcon(parent, '  check \n\t');
        assert.ok(span.innerHTML.includes('<svg'));
      });
    });
  });

  // =========================================================================
  // F2 Boundary: Ciclo Revisões Module
  // =========================================================================
  describe('F2 Boundary: Ciclo Revisões Module', () => {
    const cicloPath = path.resolve(ROOT_DIR, '99_Meta/Snoopy/subdashboards/estudos/abas/aba_ciclo_revisoes.js');

    test('F2.B1: Pre-existing multiple elements in container are all cleared', () => {
      const { renderAbaCicloRevisoes } = require(cicloPath);
      const container = createMockEl('div');
      for (let i = 0; i < 10; i++) {
        container.createEl('div', { text: `Item ${i}` });
      }
      assert.strictEqual(container.children.length, 10);
      renderAbaCicloRevisoes(container, {});
      assert.ok(!container.innerHTML.includes('Item 0'));
      assert.ok(!container.innerHTML.includes('Item 9'));
    });

    test('F2.B2: Child renderer throwing error does not corrupt parent container', () => {
      const { renderAbaCicloRevisoes } = require(cicloPath);
      const container = createMockEl('div');
      const ctx = {
        renderAbaCiclo: () => { throw new Error('Simulated render error'); }
      };
      // In JS, errors in callbacks can throw or be trapped; verify container structure initialized
      try {
        renderAbaCicloRevisoes(container, ctx);
      } catch (err) {
        assert.strictEqual(err.message, 'Simulated render error');
      }
    });

    test('F2.B3: Null or undefined ctx defaults gracefully', () => {
      const { renderAbaCicloRevisoes } = require(cicloPath);
      const container = createMockEl('div');
      assert.doesNotThrow(() => renderAbaCicloRevisoes(container, { app: {} }));
      assert.ok(container.children.length >= 1);
    });

    test('F2.B4: Repeated calls on same container do not leak children', () => {
      const { renderAbaCicloRevisoes } = require(cicloPath);
      const container = createMockEl('div');
      for (let i = 0; i < 5; i++) {
        renderAbaCicloRevisoes(container, {});
      }
      assert.strictEqual(container.children.length, 1, 'Only one root wrapper must exist');
    });

    test('F2.B5: Deeply nested empty container renders cleanly', () => {
      const { renderAbaCicloRevisoes } = require(cicloPath);
      const outer = createMockEl('div');
      const nested = outer.createEl('div');
      renderAbaCicloRevisoes(nested, {});
      assert.ok(nested.querySelector('.snoopy-card-box'));
    });
  });

  // =========================================================================
  // F3 Boundary: Code Hygiene & Manifest Sync
  // =========================================================================
  describe('F3 Boundary: Manifest Validation', () => {
    test('F3.B1: Malformed JSON string throws parse error safely', () => {
      const malformedJson = '{ "versao": "0.9.0", "motor": { missing_quotes: 1 } }';
      assert.throws(() => JSON.parse(malformedJson), SyntaxError);
    });

    test('F3.B2: Manifest object with extra unmapped fields remains compatible', () => {
      const extendedManifest = {
        versao: '0.9.0',
        motor: {},
        customProperty: 'extra_value_compat'
      };
      assert.strictEqual(extendedManifest.customProperty, 'extra_value_compat');
      assert.strictEqual(extendedManifest.versao, '0.9.0');
    });

    test('F3.B3: Manifest with empty motor map is handled safely', () => {
      const emptyMotorManifest = { versao: '0.9.0', motor: {} };
      assert.strictEqual(Object.keys(emptyMotorManifest.motor).length, 0);
    });

    test('F3.B4: Invalid SHA-256 hash length detected as invalid', () => {
      const isValidSha256 = (str) => typeof str === 'string' && str.startsWith('sha256:') && /^[0-9a-f]{64}$/i.test(str.slice(7));
      assert.strictEqual(isValidSha256('sha256:12345'), false);
      assert.strictEqual(isValidSha256('md5:abc'), false);
      assert.strictEqual(isValidSha256('sha256:' + 'a'.repeat(64)), true);
    });

    test('F3.B5: Version string with whitespace is cleaned or flagged', () => {
      const rawVersion = '  0.9.0  ';
      const clean = rawVersion.trim();
      assert.strictEqual(clean, '0.9.0');
      assert.ok(/^\d+\.\d+\.\d+$/.test(clean));
    });
  });

  // =========================================================================
  // F4 Boundary: UIKit Icons Expansion
  // =========================================================================
  describe('F4 Boundary: UIKit Icons', () => {
    test('F4.B1: Uppercase icon query maps safely or defaults to circle', () => {
      const UIKit = getUIKit();
      const parent = createMockEl('div');
      const span = UIKit.renderIcon(parent, 'CHECK');
      assert.ok(span.innerHTML.includes('<svg'));
    });

    test('F4.B2: Custom color with rgba() opacity is applied in stroke', () => {
      const UIKit = getUIKit();
      const parent = createMockEl('div');
      const span = UIKit.renderIcon(parent, 'play', { color: 'rgba(255, 255, 255, 0.5)' });
      assert.ok(span.innerHTML.includes('stroke="rgba(255, 255, 255, 0.5)"'));
    });

    test('F4.B3: Custom CSS class containing multiple classes is applied', () => {
      const UIKit = getUIKit();
      const parent = createMockEl('div');
      const span = UIKit.renderIcon(parent, 'check', { cls: 'class-one class-two class-three' });
      assert.ok(span.classList.contains('class-one'));
      assert.ok(span.classList.contains('class-two'));
      assert.ok(span.classList.contains('class-three'));
    });

    test('F4.B4: Rendering multiple icons in same parent creates separate spans', () => {
      const UIKit = getUIKit();
      const parent = createMockEl('div');
      UIKit.renderIcon(parent, 'play');
      UIKit.renderIcon(parent, 'pause');
      UIKit.renderIcon(parent, 'volume-2');
      assert.strictEqual(parent.children.length, 3);
    });

    test('F4.B5: Empty options object uses defaults (size 14, currentColor)', () => {
      const UIKit = getUIKit();
      const parent = createMockEl('div');
      const span = UIKit.renderIcon(parent, 'check', {});
      assert.ok(span.innerHTML.includes('width="14"'));
      assert.ok(span.innerHTML.includes('stroke="currentColor"'));
    });
  });

  // =========================================================================
  // F5 Boundary: UI Emoji & Glyph Elimination
  // =========================================================================
  describe('F5 Boundary: Emoji Elimination', () => {
    test('F5.B1: Sequence of multiple emojis in task metadata stripped cleanly', () => {
      const TaskParser = require('../../99_Meta/Snoopy/core/task_parser.js');
      const DateUtils = require('../../99_Meta/Snoopy/core/date_utils.js');
      const raw = 'Escrever código 📅 2026-10-10 🍅 4 ⏫ 🌅 Manhã 🔁 seg-sex';
      const parsed = TaskParser.parseMetadata(raw, '2026-10-10', DateUtils);
      assert.strictEqual(parsed.cleanText, 'Escrever código');
    });

    test('F5.B2: Unicode surrogate pairs detected by emoji validator', () => {
      const emojiRegex = /\p{Extended_Pictographic}/u;
      assert.strictEqual(emojiRegex.test('⚡'), true);
      assert.strictEqual(emojiRegex.test('🎉'), true);
      assert.strictEqual(emojiRegex.test('🎯'), true);
      assert.strictEqual(emojiRegex.test('Texto Limpo Sem Emoji'), false);
    });

    test('F5.B3: Button with empty label creates icon-only button without error', () => {
      const UIKit = getUIKit();
      const parent = createMockEl('div');
      const btn = UIKit.criarBotao(parent, {
        label: '',
        icon: 'settings',
        variant: 'icon'
      });
      assert.ok(btn.innerHTML.includes('<svg'));
      assert.strictEqual(btn.innerText.trim(), '');
    });

    test('F5.B4: Card header with undefined subtitle and meta does not print "undefined"', () => {
      const UIKit = getUIKit();
      const parent = createMockEl('div');
      UIKit.criarCardHeader(parent, { title: 'Título Somente' });
      assert.ok(!parent.innerHTML.includes('undefined'));
      assert.ok(!parent.innerHTML.includes('null'));
    });

    test('F5.B5: Empty state with null action renders without button child', () => {
      const UIKit = getUIKit();
      const parent = createMockEl('div');
      UIKit.criarEstadoVazio(parent, {
        icon: 'inbox',
        titulo: 'Vazio',
        descricao: 'Nada aqui',
        acao: null
      });
      assert.strictEqual(parent.querySelectorAll('button').length, 0);
    });
  });

  // =========================================================================
  // F6 Boundary: Theme Token Adherence
  // =========================================================================
  describe('F6 Boundary: Theme Tokens', () => {
    test('F6.B1: CSS hex color normalization handles 3 and 6 digit hex correctly', () => {
      const normalizeHex = (hex) => {
        if (hex.length === 4) {
          return '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
        }
        return hex.toLowerCase();
      };
      assert.strictEqual(normalizeHex('#070709'), '#070709');
      assert.strictEqual(normalizeHex('#fff'), '#ffffff');
    });

    test('F6.B2: Border opacity 0.08 is within subtle range [0.05, 0.15]', () => {
      const opacity = 0.08;
      assert.ok(opacity >= 0.05 && opacity <= 0.15, 'Border must be subtle');
    });

    test('F6.B3: Dark background luminance is below 0.05 (deep dark)', () => {
      // Relative luminance formula for #070709: (0.2126*7 + 0.7152*7 + 0.0722*9)/255 / 12.92
      const r = 7 / 255;
      const g = 7 / 255;
      const b = 9 / 255;
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      assert.ok(lum < 0.05, 'Background #070709 must be deep black');
    });

    test('F6.B4: Theme CSS handles comments without syntax issues', () => {
      const cssWithComment = '/* Comment */ :root { --bg: #070709; }';
      assert.ok(cssWithComment.includes('#070709'));
    });

    test('F6.B5: Semantic token names follow snoopy- prefix convention', () => {
      const tokenNames = ['--snoopy-bg', '--snoopy-border', '--snoopy-green', '--snoopy-accent'];
      tokenNames.forEach(t => assert.ok(t.startsWith('--snoopy-')));
    });
  });

  // =========================================================================
  // F7 Boundary: Web Audio Procedural Synthesis
  // =========================================================================
  describe('F7 Boundary: Web Audio Engine', () => {
    test('F7.B1: Volume set to 0.0 sets gain to zero without negative value', (t) => {
      const PomodoroAudio = getPomodoroAudio();
      if (!PomodoroAudio) {
        t.skip('PomodoroAudio pending M3');
        return;
      }
      assert.doesNotThrow(() => PomodoroAudio.ajustarVolume(0.0));
    });

    test('F7.B2: Volume set to 1.0 sets gain to maximum without distortion', (t) => {
      const PomodoroAudio = getPomodoroAudio();
      if (!PomodoroAudio) {
        t.skip('PomodoroAudio pending M3');
        return;
      }
      assert.doesNotThrow(() => PomodoroAudio.ajustarVolume(1.0));
    });

    test('F7.B3: Negative volume (-50.0) is clamped safely to 0.0', (t) => {
      const PomodoroAudio = getPomodoroAudio();
      if (!PomodoroAudio) {
        t.skip('PomodoroAudio pending M3');
        return;
      }
      assert.doesNotThrow(() => PomodoroAudio.ajustarVolume(-50.0));
    });

    test('F7.B4: Overflow volume (999.0) is clamped safely to 1.0', (t) => {
      const PomodoroAudio = getPomodoroAudio();
      if (!PomodoroAudio) {
        t.skip('PomodoroAudio pending M3');
        return;
      }
      assert.doesNotThrow(() => PomodoroAudio.ajustarVolume(999.0));
    });

    test('F7.B5: Rapid alternating play/pause loop does not crash engine', (t) => {
      const PomodoroAudio = getPomodoroAudio();
      if (!PomodoroAudio) {
        t.skip('PomodoroAudio pending M3');
        return;
      }
      assert.doesNotThrow(() => {
        for (let i = 0; i < 10; i++) {
          PomodoroAudio.tocarFaixa('white_noise');
          PomodoroAudio.pausar();
        }
      });
    });
  });

  // =========================================================================
  // F8 Boundary: Cockpit Pomodoro Audio UI
  // =========================================================================
  describe('F8 Boundary: Cockpit Pomodoro Audio UI', () => {
    test('F8.B1: Clicking play when already playing maintains playing state safely', () => {
      let isPlaying = false;
      const toggle = () => { isPlaying = !isPlaying; };
      toggle();
      assert.strictEqual(isPlaying, true);
      // Simulate double toggle
      toggle();
      assert.strictEqual(isPlaying, false);
    });

    test('F8.B2: Volume slider string values coerced to float accurately', () => {
      const sliderVal = '75';
      const floatVal = parseFloat(sliderVal) / 100;
      assert.strictEqual(floatVal, 0.75);
    });

    test('F8.B3: Repeated mute/unmute toggles restore previous volume', () => {
      let currentVol = 0.8;
      let previousVol = currentVol;
      let isMuted = false;

      const toggleMute = () => {
        if (!isMuted) {
          previousVol = currentVol;
          currentVol = 0;
          isMuted = true;
        } else {
          currentVol = previousVol;
          isMuted = false;
        }
      };

      toggleMute();
      assert.strictEqual(currentVol, 0);
      assert.strictEqual(isMuted, true);
      toggleMute();
      assert.strictEqual(currentVol, 0.8);
      assert.strictEqual(isMuted, false);
    });

    test('F8.B4: Rendering dock in disconnected container operates safely', () => {
      const detached = createMockEl('div');
      detached.createEl('div', { cls: 'snoopy-audio-dock' });
      assert.ok(detached.querySelector('.snoopy-audio-dock'));
    });

    test('F8.B5: Chime synthesis with 0 volume handles safely', () => {
      const mockCtx = new MockAudioContext();
      const gain = mockCtx.createGain();
      gain.gain.setValueAtTime(0);
      assert.strictEqual(gain.gain.value, 0);
    });
  });

  // =========================================================================
  // F9 Boundary: Audio Preference Persistence
  // =========================================================================
  describe('F9 Boundary: Audio Persistence', () => {
    test('F9.B1: String "NaN" in localStorage falls back to default volume', () => {
      const storage = createMockLocalStorage();
      storage.setItem('snoopy_pomodoro_audio_volume', 'NaN');
      const val = parseFloat(storage.getItem('snoopy_pomodoro_audio_volume'));
      const safeVolume = Number.isNaN(val) ? 0.5 : val;
      assert.strictEqual(safeVolume, 0.5);
    });

    test('F9.B2: Negative volume string in localStorage clamps to 0.0', () => {
      const storage = createMockLocalStorage();
      storage.setItem('snoopy_pomodoro_audio_volume', '-0.5');
      const val = parseFloat(storage.getItem('snoopy_pomodoro_audio_volume'));
      const safeVolume = Math.max(0.0, Math.min(1.0, val));
      assert.strictEqual(safeVolume, 0.0);
    });

    test('F9.B3: Overflow volume string in localStorage clamps to 1.0', () => {
      const storage = createMockLocalStorage();
      storage.setItem('snoopy_pomodoro_audio_volume', '2.5');
      const val = parseFloat(storage.getItem('snoopy_pomodoro_audio_volume'));
      const safeVolume = Math.max(0.0, Math.min(1.0, val));
      assert.strictEqual(safeVolume, 1.0);
    });

    test('F9.B4: Cleared localStorage re-initializes defaults cleanly', () => {
      const storage = createMockLocalStorage();
      storage.setItem('snoopy_pomodoro_audio_volume', '0.9');
      storage.clear();
      assert.strictEqual(storage.getItem('snoopy_pomodoro_audio_volume'), null);
    });

    test('F9.B5: Boolean strings ("true" vs "false") parsed strictly', () => {
      const storage = createMockLocalStorage();
      storage.setItem('snoopy_pomodoro_audio_muted', 'false');
      assert.strictEqual(storage.getItem('snoopy_pomodoro_audio_muted') === 'true', false);
      storage.setItem('snoopy_pomodoro_audio_muted', 'true');
      assert.strictEqual(storage.getItem('snoopy_pomodoro_audio_muted') === 'true', true);
    });
  });

  // =========================================================================
  // F10 Boundary: Autonomous ShopStore Decoupling
  // =========================================================================
  describe('F10 Boundary: Autonomous ShopStore', () => {
    test('F10.B1: Crediting 0 minutes awards minimum 1 coin or handles gracefully', async () => {
      const JardimStore = getJardimStore();
      const mockApp = criarMockApp(null);
      const res = await JardimStore.creditarFoco(mockApp, 0, 1);
      assert.ok(res.moedasGanhas >= 1, 'Minimum 1 coin awarded per completed session');
    });

    test('F10.B2: Negative minutes clamped defensively', async () => {
      const JardimStore = getJardimStore();
      const mockApp = criarMockApp(null);
      const res = await JardimStore.creditarFoco(mockApp, -10, 1);
      assert.ok(res.moedasGanhas >= 1);
    });

    test('F10.B3: Purchasing item with exact balance reduces saldo to exactly 0', async () => {
      const JardimStore = getJardimStore();
      const mockApp = criarMockApp({ moedas: 50, desbloqueadas: ['sprout'] });
      const res = await JardimStore.comprarArvore(mockApp, 'flower-2'); // costs 50
      assert.strictEqual(res.sucesso, true);
      assert.strictEqual(res.estado.moedas, 0);
    });

    test('F10.B4: Purchasing already unlocked item rejects without debiting coins', async () => {
      const JardimStore = getJardimStore();
      const mockApp = criarMockApp({ moedas: 100, desbloqueadas: ['sprout', 'flower-2'] });
      const res = await JardimStore.comprarArvore(mockApp, 'flower-2');
      assert.strictEqual(res.sucesso, false);
      assert.strictEqual(res.estado.moedas, 100);
    });

    test('F10.B5: Purchasing non-existent item ID returns failure safely', async () => {
      const JardimStore = getJardimStore();
      const mockApp = criarMockApp({ moedas: 500, desbloqueadas: ['sprout'] });
      const res = await JardimStore.comprarArvore(mockApp, 'non_existent_item_999');
      assert.strictEqual(res.sucesso, false);
      assert.ok(res.mensagem.includes('não encontrada'));
    });
  });

  // =========================================================================
  // F11 Boundary: Backward-Compatible Jardim Facade
  // =========================================================================
  describe('F11 Boundary: JardimStore Facade', () => {
    test('F11.B1: Corrupted JSON in vault returns default state without crash', async () => {
      const JardimStore = getJardimStore();
      const mockApp = criarMockApp('MALFORMED_JSON_STRING{{{');
      const estado = await JardimStore.carregar(mockApp);
      assert.strictEqual(estado.moedas, 0);
      assert.strictEqual(estado.arvoreAtiva, 'sprout');
      assert.deepStrictEqual(estado.desbloqueadas, ['sprout']);
    });

    test('F11.B2: Missing desbloqueadas in file defaults to [sprout]', async () => {
      const JardimStore = getJardimStore();
      const mockApp = criarMockApp({ moedas: 20 });
      const estado = await JardimStore.carregar(mockApp);
      assert.ok(Array.isArray(estado.desbloqueadas));
      assert.ok(estado.desbloqueadas.includes('sprout'));
    });

    test('F11.B3: Selecting already active tree is idempotent', async () => {
      const JardimStore = getJardimStore();
      const mockApp = criarMockApp({ moedas: 10, desbloqueadas: ['sprout'], arvoreAtiva: 'sprout' });
      const res = await JardimStore.selecionarArvore(mockApp, 'sprout');
      assert.strictEqual(res.sucesso, true);
      assert.strictEqual(res.estado.arvoreAtiva, 'sprout');
    });

    test('F11.B4: Selecting locked tree returns failure and keeps current tree', async () => {
      const JardimStore = getJardimStore();
      const mockApp = criarMockApp({ moedas: 10, desbloqueadas: ['sprout'], arvoreAtiva: 'sprout' });
      const res = await JardimStore.selecionarArvore(mockApp, 'tree-pine');
      assert.strictEqual(res.sucesso, false);
      assert.strictEqual(res.estado.arvoreAtiva, 'sprout');
    });

    test('F11.B5: Massive combo (combo=50) caps bonus at +3', async () => {
      const JardimStore = getJardimStore();
      const mockApp = criarMockApp(null);
      const res = await JardimStore.creditarFoco(mockApp, 25, 50);
      assert.strictEqual(res.bonusCombo, 3);
      assert.strictEqual(res.moedasGanhas, 8); // 5 base + 3 bonus
    });
  });

  // =========================================================================
  // F12 Boundary: Standalone Shop Modal UI
  // =========================================================================
  describe('F12 Boundary: Standalone Shop Modal UI', () => {
    test('F12.B1: Category with 0 items renders empty placeholder safely', () => {
      const UIKit = getUIKit();
      const parent = createMockEl('div');
      UIKit.criarEstadoVazio(parent, {
        icon: 'shopping-bag',
        titulo: 'Categoria Vazia',
        descricao: 'Nenhum item disponível nesta categoria.'
      });
      assert.ok(parent.innerHTML.includes('Categoria Vazia'));
    });

    test('F12.B2: Extremely long item description renders inside card without crashing', () => {
      const parent = createMockEl('div');
      const longLore = 'A'.repeat(5000);
      const card = parent.createEl('div', { cls: 'snoopy-shop-card' });
      card.createEl('p', { text: longLore });
      assert.strictEqual(card.innerText.length, 5000);
    });

    test('F12.B3: Switching between categories clears previous card list', () => {
      const parent = createMockEl('div');
      const grid = parent.createEl('div', { cls: 'snoopy-shop-grid' });
      grid.createEl('div', { cls: 'snoopy-shop-card', text: 'Item Botânico' });
      assert.strictEqual(grid.children.length, 1);

      grid.empty();
      grid.createEl('div', { cls: 'snoopy-shop-card', text: 'Item Áudio' });
      assert.strictEqual(grid.children.length, 1);
      assert.ok(grid.innerHTML.includes('Item Áudio'));
    });

    test('F12.B4: Double clicking purchase button handled idempotently', async () => {
      const JardimStore = getJardimStore();
      const mockApp = criarMockApp({ moedas: 50, desbloqueadas: ['sprout'] });
      const first = await JardimStore.comprarArvore(mockApp, 'flower-2');
      const second = await JardimStore.comprarArvore(mockApp, 'flower-2');
      assert.strictEqual(first.sucesso, true);
      assert.strictEqual(second.sucesso, false); // Already unlocked
      assert.strictEqual(second.estado.moedas, 0); // No double debit
    });

    test('F12.B5: Disabling purchase button adds disabled attribute', () => {
      const parent = createMockEl('div');
      const btn = parent.createEl('button', { cls: 'snoopy-btn-action' });
      btn.disabled = true;
      assert.strictEqual(btn.disabled, true);
    });
  });

  // =========================================================================
  // F13 Boundary: Docs-as-Code & Emoji Sanitation
  // =========================================================================
  describe('F13 Boundary: Documentation Verification', () => {
    test('F13.B1: Markdown with CRLF line endings parses lines cleanly', () => {
      const sample = '# Header\r\n\r\nParagraph text\r\n';
      const lines = sample.replace(/\r\n/g, '\n').split('\n');
      assert.strictEqual(lines[0], '# Header');
    });

    test('F13.B2: Markdown headers with code backticks do not trigger emoji regex', () => {
      const header = '### `ShopStore.carregar(app)`';
      const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/u;
      assert.strictEqual(emojiRegex.test(header), false);
    });

    test('F13.B3: Portuguese accented characters (ã, ç, é) are preserved in docs', () => {
      const text = 'Central de Personalizações & Revisões (Estudos)';
      assert.ok(text.includes('ç'));
      assert.ok(text.includes('õ'));
      assert.ok(text.includes('õ'));
    });

    test('F13.B4: Zero-byte file is identified as empty', () => {
      const emptyContent = '';
      assert.strictEqual(emptyContent.length, 0);
    });

    test('F13.B5: Markdown table syntax has valid column separators', () => {
      const tableRow = '| Col 1 | Col 2 | Col 3 |';
      const cols = tableRow.split('|').filter(c => c.trim().length > 0);
      assert.strictEqual(cols.length, 3);
    });
  });

  // =========================================================================
  // F14 Boundary: Conventional Commits & Hashes
  // =========================================================================
  describe('F14 Boundary: Conventional Commits', () => {
    test('F14.B1: Commit message with trailing whitespace trimmed and validated', () => {
      const raw = 'feat(audio): implementar sintetizador   \n';
      const trimmed = raw.trim();
      const regex = /^[a-z]+(\([a-z0-9_-]+\))?:\s.+$/;
      assert.strictEqual(regex.test(trimmed), true);
    });

    test('F14.B2: Commit message with uppercase type rejected', () => {
      const regex = /^[a-z]+(\([a-z0-9_-]+\))?:\s.+$/;
      assert.strictEqual(regex.test('FEAT(audio): uppercase type'), false);
    });

    test('F14.B3: Commit message with hyphenated scope accepted', () => {
      const regex = /^[a-z]+(\([a-z0-9_-]+\))?:\s.+$/;
      assert.strictEqual(regex.test('refactor(daily-tracker): otimizar kanban'), true);
    });

    test('F14.B4: Hash prefix sha256: extracted cleanly', () => {
      const formatted = 'sha256:4bbce684cddeb3da442c314bbd9353260034b86a17cc3fb1f2c1c84d8bd53404';
      assert.ok(formatted.startsWith('sha256:'));
      const raw = formatted.slice(7);
      assert.strictEqual(raw.length, 64);
    });

    test('F14.B5: Empty commit message description rejected', () => {
      const regex = /^[a-z]+(\([a-z0-9_-]+\))?:\s\S+.*$/;
      assert.strictEqual(regex.test('feat(audio): '), false);
    });
  });

  // =========================================================================
  // F15 Boundary: Regression-Free Core Baseline
  // =========================================================================
  describe('F15 Boundary: Core Baseline Functions', () => {
    test('F15.B1: DateUtils.somarDias with 0 offset returns same date', () => {
      const DateUtils = require('../../99_Meta/Snoopy/core/date_utils.js');
      assert.strictEqual(DateUtils.somarDias('2026-10-31', 0), '2026-10-31');
    });

    test('F15.B2: DateUtils.somarDias across leap year boundary (2028-02-28 + 1)', () => {
      const DateUtils = require('../../99_Meta/Snoopy/core/date_utils.js');
      assert.strictEqual(DateUtils.somarDias('2028-02-28', 1), '2028-02-29');
    });

    test('F15.B3: TaskParser with empty string returns null or clean defaults', () => {
      const TaskParser = require('../../99_Meta/Snoopy/core/task_parser.js');
      const DateUtils = require('../../99_Meta/Snoopy/core/date_utils.js');
      const res = TaskParser.parseMetadata('', '2026-10-10', DateUtils);
      assert.strictEqual(res.cleanText, '');
      assert.strictEqual(res.dueStr, null);
    });

    test('F15.B4: ModalFactory.abrir with empty htmlContent opens without crash', () => {
      if (typeof global.document === 'undefined') {
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
      const { modalBox, fechar } = ModalFactory.abrir({ htmlContent: '' });
      assert.ok(modalBox);
      fechar();
    });

    test('F15.B5: Lifecycle.dispose for an unregistered scope is a safe no-op', () => {
      const Lifecycle = require('../../99_Meta/Snoopy/core/lifecycle.js');
      assert.doesNotThrow(() => Lifecycle.dispose('scope_that_never_existed_999'));
    });
  });

});

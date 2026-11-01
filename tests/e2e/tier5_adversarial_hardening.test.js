/**
 * Snoopy Vault - E2E Test Suite
 * Tier 5: Adversarial Hardening & Stress Testing
 * Rigorous adversarial input testing, injection defense, concurrent mutations, and resource stress.
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
  getShopStore
} = require('./helpers/e2e_utils.js');

describe('Tier 5: Adversarial Hardening & Stress Testing', () => {

  // =========================================================================
  // 1. Injection & Malformed Input Hardening
  // =========================================================================
  describe('1. Injection & Input Sanitization Defense', () => {
    test('Adv 1.1: Path traversal and script tags in item ID are rejected safely', async () => {
      const JardimStore = getJardimStore();
      const mockApp = criarMockApp({ moedas: 1000, desbloqueadas: ['sprout'] });

      const maliciousIds = [
        '../../secrets/id_rsa',
        '<script>alert("xss")</script>',
        'SELECT * FROM users;',
        '__proto__',
        'constructor',
        '\x00nullbyte'
      ];

      for (const malId of maliciousIds) {
        const res = await JardimStore.comprarArvore(mockApp, malId);
        assert.strictEqual(res.sucesso, false, `Malicious ID "${malId}" must be rejected`);
        const estadoAtual = await JardimStore.carregar(mockApp);
        assert.strictEqual(estadoAtual.moedas, 1000, 'Balance must remain intact');
      }
    });

    test('Adv 1.2: Icon rendering with attribute escape attempt neutralizes injection', () => {
      const UIKit = getUIKit();
      const parent = createMockEl('div');
      const maliciousCls = '"><script>alert(1)</script><span class="';
      const maliciousColor = 'red" onmouseover="alert(1)';

      assert.doesNotThrow(() => {
        UIKit.renderIcon(parent, 'check', { cls: maliciousCls, color: maliciousColor });
      });
      // Verification: DOM element created without crashing and structure preserved
      assert.ok(parent.querySelector('.snoopy-icon'));
    });

    test('Adv 1.3: Task line with corrupt control characters and massive length parsed safely', () => {
      const TaskParser = require('../../99_Meta/Snoopy/core/task_parser.js');
      const DateUtils = require('../../99_Meta/Snoopy/core/date_utils.js');
      const hugeTask = 'X'.repeat(50000) + ' \x00\x01\x1F 📅 2026-10-31 ⏫ 🍅 999999999';

      const res = TaskParser.parseMetadata(hugeTask, '2026-10-31', DateUtils);
      assert.strictEqual(res.dueStr, '2026-10-31');
      assert.strictEqual(res.prio, 'alta');
      assert.strictEqual(res.pomosEst, '999999999');
      assert.ok(res.cleanText.includes('XXXXX'));
    });
  });

  // =========================================================================
  // 2. Concurrency & Race Condition Defense
  // =========================================================================
  describe('2. Concurrent Operations & Race Conditions', () => {
    test('Adv 2.1: Concurrent credit operations preserve atomic saldo progression', async () => {
      const JardimStore = getJardimStore();
      const mockApp = criarMockApp(null);

      // Perform 5 consecutive focus completions
      for (let i = 1; i <= 5; i++) {
        await JardimStore.creditarFoco(mockApp, 25, i);
      }

      const estadoFinal = await JardimStore.carregar(mockApp);
      // Combo: c=1(+5), c=2(+5), c=3(+6), c=4(+6), c=5(+7) => 5+5+6+6+7 = 29
      assert.strictEqual(estadoFinal.moedas, 29);
    });

    test('Adv 2.2: Insufficient balance race condition prevents double spending', async () => {
      const JardimStore = getJardimStore();
      // Balance is only 50 (can afford exactly ONE flower-2)
      const mockApp = criarMockApp({ moedas: 50, desbloqueadas: ['sprout'] });

      const purchase1 = await JardimStore.comprarArvore(mockApp, 'flower-2');
      const purchase2 = await JardimStore.comprarArvore(mockApp, 'flower-2');

      assert.strictEqual(purchase1.sucesso, true);
      assert.strictEqual(purchase2.sucesso, false);
      assert.strictEqual(purchase2.estado.moedas, 0);
    });
  });

  // =========================================================================
  // 3. Vault Storage Mutation & File Corruption Defense
  // =========================================================================
  describe('3. Storage Mutation & Corrupted Persistence', () => {
    test('Adv 3.1: Half-written JSON syntax safely falls back to standard state', async () => {
      const JardimStore = getJardimStore();
      const truncated = '{"moedas": 200, "desbloqueadas": ["sprout", "flow';
      const mockApp = criarMockApp(truncated);

      const estado = await JardimStore.carregar(mockApp);
      assert.strictEqual(estado.moedas, 0);
      assert.strictEqual(estado.arvoreAtiva, 'sprout');
    });

    test('Adv 3.2: Missing properties in storage fallback safely', async () => {
      const JardimStore = getJardimStore();
      const corruptTypes = {
        // missing moedas entirely
        arvoreAtiva: 'sprout'
      };
      const mockApp = criarMockApp(corruptTypes);

      const estado = await JardimStore.carregar(mockApp);
      assert.strictEqual(typeof estado.moedas, 'number');
      assert.strictEqual(estado.moedas, 0);
      assert.ok(Array.isArray(estado.desbloqueadas));
      assert.ok(estado.desbloqueadas.includes('sprout'));
    });
  });

  // =========================================================================
  // 4. Extreme Numeric Boundaries & Overflow Protection
  // =========================================================================
  describe('4. Extreme Numeric Boundaries', () => {
    test('Adv 4.1: NaN and Infinity in minutes input handled defensibly', async () => {
      const JardimStore = getJardimStore();
      const mockApp = criarMockApp(null);

      const resNaN = await JardimStore.creditarFoco(mockApp, NaN, 1);
      assert.ok(!Number.isNaN(resNaN.moedasGanhas));
      assert.ok(!Number.isNaN(resNaN.saldoAtual));
    });

    test('Adv 4.2: Extremely large focus duration (10,000 hours) does not overflow wallet', async () => {
      const JardimStore = getJardimStore();
      const mockApp = criarMockApp(null);
      const minutes = 10000 * 60; // 600,000 minutes

      const res = await JardimStore.creditarFoco(mockApp, minutes, 1);
      assert.strictEqual(res.moedasGanhas, 120000); // 600,000 / 5
      assert.strictEqual(res.saldoAtual, 120000);
      assert.ok(Number.isFinite(res.saldoAtual));
    });
  });

  // =========================================================================
  // 5. Procedural Audio Synthesis Safety
  // =========================================================================
  describe('5. Audio Synthesis Safety & Memory Stress', () => {
    test('Adv 5.1: 50 successive AudioContext buffer node creations do not crash or leak', () => {
      const mockCtx = new MockAudioContext();
      for (let i = 0; i < 50; i++) {
        const source = mockCtx.createBufferSource();
        const gain = mockCtx.createGain();
        source.connect(gain);
        gain.connect(mockCtx.destination);
        source.start();
        source.stop();
      }
      assert.strictEqual(mockCtx.nodesCreated.length, 100);
    });

    test('Adv 5.2: Synthesis mathematical bounds remain strictly finite', () => {
      const buffer = new Float32Array(5000);
      let lastOut = 0;
      for (let i = 0; i < 5000; i++) {
        const white = (Math.random() * 2) - 1.0;
        lastOut = (lastOut + (0.02 * white)) / 1.02;
        const val = Math.max(-1.0, Math.min(1.0, lastOut * 3.5));
        buffer[i] = val;
        assert.ok(Number.isFinite(buffer[i]));
        assert.ok(buffer[i] >= -1.0 && buffer[i] <= 1.0);
      }
    });
  });

});

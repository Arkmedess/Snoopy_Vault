/**
 * Snoopy Vault - Milestone M1 Empirical Stress Harness (Challenger 1)
 * Executado nativamente via `node --test`.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const UIKit = require('../../99_Meta/Snoopy/core/ui_kit.js');
const { renderAbaCicloRevisoes } = require('../../99_Meta/Snoopy/subdashboards/estudos/abas/aba_ciclo_revisoes.js');
const { createMockEl } = require('../helpers/test_utils.js');

describe('Milestone M1 Challenger Stress Test Suite', () => {
  describe('UIKit.renderIcon() Robustness & Edge Cases', () => {
    test('renders fallback circle cleanly when iconName is undefined', () => {
      const container = createMockEl('div');
      assert.doesNotThrow(() => {
        UIKit.renderIcon(container, undefined, {});
      });
      assert.strictEqual(container.children.length, 1);
      const span = container.children[0];
      assert.ok(span.className.includes('snoopy-icon'));
      assert.ok(span.innerHTML.includes('<circle cx="12" cy="12" r="8"/>'));
    });

    test('renders fallback circle cleanly when iconName is null', () => {
      const container = createMockEl('div');
      assert.doesNotThrow(() => {
        UIKit.renderIcon(container, null, {});
      });
      const span = container.children[0];
      assert.ok(span.innerHTML.includes('<circle cx="12" cy="12" r="8"/>'));
    });

    test('renders fallback circle cleanly when iconName is empty string', () => {
      const container = createMockEl('div');
      assert.doesNotThrow(() => {
        UIKit.renderIcon(container, '', {});
      });
      const span = container.children[0];
      assert.ok(span.innerHTML.includes('<circle cx="12" cy="12" r="8"/>'));
    });

    test('renders fallback circle cleanly when iconName is unknown string', () => {
      const container = createMockEl('div');
      assert.doesNotThrow(() => {
        UIKit.renderIcon(container, 'non-existent-icon-name-xyz-999', {});
      });
      const span = container.children[0];
      assert.ok(span.innerHTML.includes('<circle cx="12" cy="12" r="8"/>'));
    });

    test('safely handles malicious strings without throwing or breaking SVG structure', () => {
      const container = createMockEl('div');
      const maliciousPayloads = [
        '<script>alert("xss")</script>',
        '"><img src=x onerror=alert(1)>',
        '"><svg onload=alert(1)>',
        '\' onfocus=\'alert(1)'
      ];

      for (const payload of maliciousPayloads) {
        assert.doesNotThrow(() => {
          UIKit.renderIcon(container, payload, {});
        });
        const span = container.children[container.children.length - 1];
        assert.ok(span.innerHTML.includes('<circle cx="12" cy="12" r="8"/>'));
      }
    });

    test('handles prototype keys (toString, constructor, __proto__) without throwing', () => {
      const container = createMockEl('div');
      for (const protoKey of ['toString', 'constructor', '__proto__', 'valueOf']) {
        assert.doesNotThrow(() => {
          UIKit.renderIcon(container, protoKey, {});
        });
        assert.strictEqual(container.children.length > 0, true);
      }
    });

    test('handles empty options ({}) and omitted options (undefined) with sensible defaults', () => {
      const c1 = createMockEl('div');
      const s1 = UIKit.renderIcon(c1, 'calendar', {});
      assert.strictEqual(s1.style.width, '14px');
      assert.strictEqual(s1.style.height, '14px');

      const c2 = createMockEl('div');
      const s2 = UIKit.renderIcon(c2, 'calendar');
      assert.strictEqual(s2.style.width, '14px');
      assert.strictEqual(s2.style.height, '14px');
    });

    test('applies custom size, color and cls correctly', () => {
      const container = createMockEl('div');
      const span = UIKit.renderIcon(container, 'calendar', {
        size: 24,
        color: '#60a5fa',
        cls: 'test-custom-icon'
      });
      assert.strictEqual(span.style.width, '24px');
      assert.strictEqual(span.style.height, '24px');
      assert.strictEqual(span.style.color, '#60a5fa');
      assert.ok(span.className.includes('test-custom-icon'));
      assert.ok(span.className.includes('snoopy-icon'));
    });
  });

  describe('Deduplicated renderIcon() in home/view.js and leituras/view.js', () => {
    const homeCode = fs.readFileSync(path.resolve(__dirname, '../../99_Meta/Snoopy/home/view.js'), 'utf8');
    const homeFnMatch = homeCode.match(/function renderIcon\(container, iconName, [^)]*\) \{[\s\S]*?\n\}/);
    assert.ok(homeFnMatch, 'home/view.js must define renderIcon');

    const leiturasCode = fs.readFileSync(path.resolve(__dirname, '../../99_Meta/Snoopy/subdashboards/leituras/view.js'), 'utf8');
    const leiturasFnMatch = leiturasCode.match(/function renderIcon\(container, iconName, [^)]*\) \{[\s\S]*?\n  \}/);
    assert.ok(leiturasFnMatch, 'leituras/view.js must define renderIcon');

    const createHomeIcon = (uikit) => new Function('UIKit', 'return ' + homeFnMatch[0])(uikit);
    const createLeiturasIcon = (uikit) => new Function('UIKit', 'return ' + leiturasFnMatch[0])(uikit);

    test('home/view.js delegates to UIKit.renderIcon when available', () => {
      let delegated = false;
      const mockUIKit = {
        renderIcon: (container, name, opts) => {
          delegated = true;
          return container.createEl('span', { cls: 'mock-delegated' });
        }
      };

      const homeRender = createHomeIcon(mockUIKit);
      const container = createMockEl('div');
      homeRender(container, 'calendar', { size: 16 });
      assert.strictEqual(delegated, true);
    });

    test('leituras/view.js delegates to UIKit.renderIcon when available', () => {
      let delegated = false;
      const mockUIKit = {
        renderIcon: (container, name, opts) => {
          delegated = true;
          return container.createEl('span', { cls: 'mock-delegated' });
        }
      };

      const leiturasRender = createLeiturasIcon(mockUIKit);
      const container = createMockEl('div');
      leiturasRender(container, 'book-open', { size: 18 });
      assert.strictEqual(delegated, true);
    });

    test('home/view.js gracefully hides span (display: none) when icon is missing and UIKit.renderIcon is absent', () => {
      const fallbackHomeRender = createHomeIcon({ ICONS: UIKit.ICONS });
      const container = createMockEl('div');

      const span = fallbackHomeRender(container, 'unknown-xyz', {});
      assert.strictEqual(span.style.display, 'none');
      assert.strictEqual(span.innerHTML, '');
    });

    test('leituras/view.js gracefully renders circle fallback when icon is missing and UIKit.renderIcon is absent', () => {
      const fallbackLeiturasRender = createLeiturasIcon({ ICONS: UIKit.ICONS });
      const container = createMockEl('div');

      const span = fallbackLeiturasRender(container, 'unknown-xyz', {});
      assert.ok(span.innerHTML.includes('<circle cx="12" cy="12" r="8"/>'));
    });

    test('both views tolerate null/undefined UIKit instances without unhandled exceptions', () => {
      for (const nilUIKit of [null, undefined]) {
        const homeRender = createHomeIcon(nilUIKit);
        const leiturasRender = createLeiturasIcon(nilUIKit);
        const c1 = createMockEl('div');
        const c2 = createMockEl('div');

        assert.doesNotThrow(() => homeRender(c1, 'calendar', {}));
        assert.doesNotThrow(() => leiturasRender(c2, 'calendar', {}));
      }
    });
  });

  describe('AbaCicloRevisoes Malformed & Bizarre Contexts', () => {
    test('renders cleanly with minimal context ({})', () => {
      const root = createMockEl('div');
      assert.doesNotThrow(() => renderAbaCicloRevisoes(root, {}));
      assert.strictEqual(root.children.length, 1);
      assert.strictEqual(root.children[0].children.length, 2);
    });

    test('renders cleanly with { app: null } and { app: undefined }', () => {
      const r1 = createMockEl('div');
      assert.doesNotThrow(() => renderAbaCicloRevisoes(r1, { app: null }));
      assert.strictEqual(r1.children[0].children.length, 2);

      const r2 = createMockEl('div');
      assert.doesNotThrow(() => renderAbaCicloRevisoes(r2, { app: undefined }));
      assert.strictEqual(r2.children[0].children.length, 2);
    });

    test('renders fallback card text when renderers in ctx are truthy non-functions (string, number, object)', () => {
      const truthyNonFunctions = [
        { renderAbaCiclo: 'not-a-fn', renderAbaRevisoes: 'not-a-fn' },
        { renderAbaCiclo: 42, renderAbaRevisoes: 99 },
        { renderAbaCiclo: true, renderAbaRevisoes: true },
        { renderAbaCiclo: {}, renderAbaRevisoes: [] }
      ];

      for (const ctx of truthyNonFunctions) {
        const root = createMockEl('div');
        renderAbaCicloRevisoes(root, ctx);

        const wrapper = root.children[0];
        const cicloBox = wrapper.children[0];
        const revisoesBox = wrapper.children[1];

        const cicloHasFallback = cicloBox.innerHTML.includes('CICLO DE ESTUDOS - FILA SEQUENCIAL');
        const revisoesHasFallback = revisoesBox.innerHTML.includes('REVISÕES ESPAÇADAS - CURVA DE ESQUECIMENTO');

        assert.strictEqual(cicloHasFallback, true, `Ciclo should display fallback text for ctx: ${JSON.stringify(ctx)}`);
        assert.strictEqual(revisoesHasFallback, true, `Revisões should display fallback text for ctx: ${JSON.stringify(ctx)}`);
      }
    });

    test('falls back to require local submodules when renderers in ctx are falsy non-functions', () => {
      const falsyContexts = [
        { renderAbaCiclo: null, renderAbaRevisoes: null },
        { renderAbaCiclo: false, renderAbaRevisoes: false },
        { renderAbaCiclo: '', renderAbaRevisoes: '' },
        { renderAbaCiclo: 0, renderAbaRevisoes: 0 }
      ];

      for (const ctx of falsyContexts) {
        const root = createMockEl('div');
        assert.doesNotThrow(() => renderAbaCicloRevisoes(root, ctx));

        const wrapper = root.children[0];
        const cicloBox = wrapper.children[0];
        const revisoesBox = wrapper.children[1];

        // Should render child module content rather than static fallback text
        assert.strictEqual(cicloBox.children.length > 0, true);
        assert.strictEqual(revisoesBox.children.length > 0, true);
      }
    });

    test('properly routes to custom function renderers when validly supplied', () => {
      let cicloInvocado = false;
      let revInvocado = false;

      const root = createMockEl('div');
      const ctx = {
        renderAbaCiclo: (c) => { cicloInvocado = true; c.createEl('div', { text: 'custom-ciclo' }); },
        renderAbaRevisoes: (c) => { revInvocado = true; c.createEl('div', { text: 'custom-rev' }); }
      };

      renderAbaCicloRevisoes(root, ctx);
      assert.strictEqual(cicloInvocado, true);
      assert.strictEqual(revInvocado, true);
    });

    test('documents behavior when ctx is null or undefined (submodules require object destructuring)', () => {
      // In aba_ciclo_revisoes.js, if ctx is null/undefined, it delegates to required aba_ciclo.js
      // which does `const { app } = ctx;`. In JavaScript, destructuring null throws TypeError.
      // This test documents this contract: callers must provide an object context (e.g. `{}` or `{ app }`).
      const root1 = createMockEl('div');
      assert.throws(() => {
        renderAbaCicloRevisoes(root1, null);
      }, TypeError);

      const root2 = createMockEl('div');
      assert.throws(() => {
        renderAbaCicloRevisoes(root2, undefined);
      }, TypeError);
    });
  });
});

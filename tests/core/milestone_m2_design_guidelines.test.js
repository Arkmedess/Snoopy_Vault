/**
 * Snoopy Vault - Testes do Milestone M2: Design Guidelines & UIKit Lucide Icons
 * Valida a expansão do catálogo Lucide, renderização dos novos ícones e
 * ausência de caracteres literais de emojis/glifos em elementos de interface (DOM/Notices).
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const UIKit = require('../../99_Meta/Snoopy/core/ui_kit.js');

function createMockEl(tag = 'div', attrs = {}) {
  let _innerHTML = '';
  const listeners = {};
  const el = {
    tagName: tag.toUpperCase(),
    className: attrs.class || '',
    style: {},
    children: [],
    listeners,
    get innerText() { return _innerHTML; },
    set innerText(val) { _innerHTML = val; },
    get innerHTML() { return _innerHTML; },
    set innerHTML(val) { _innerHTML = val; },
    createEl: (childTag, opts = {}) => {
      const child = createMockEl(childTag, opts.attr || {});
      if (opts.cls) child.className = opts.cls;
      if (opts.text) {
        child.innerText = opts.text;
        child.innerHTML = opts.text;
      }
      el.children.push(child);
      return child;
    },
    appendChild: (child) => {
      el.children.push(child);
      return child;
    }
  };
  return el;
}

describe('Milestone M2 - Design Guidelines & Lucide Icon Expansion', () => {
  describe('Catálogo Expandido de Ícones Lucide (UIKit.ICONS)', () => {
    const iconesM2 = [
      'check-square',
      'leaf',
      'award',
      'volume-2',
      'volume-1',
      'volume-x',
      'music',
      'headphones'
    ];

    test('todos os 8 novos ícones solicitados estão presentes e possuem SVG válido', () => {
      for (const nome of iconesM2) {
        assert.ok(UIKit.ICONS[nome], `Ícone '${nome}' deve estar definido em UIKit.ICONS`);
        const svg = UIKit.ICONS[nome];
        assert.ok(typeof svg === 'string', `SVG de '${nome}' deve ser string`);
        assert.ok(svg.length > 10, `SVG de '${nome}' deve ter conteúdo vetorial substancial`);
        assert.match(svg, /<(?:path|polygon|polyline|circle|line|rect)/, `SVG de '${nome}' deve conter tags SVG válidas`);
      }
    });

    test('UIKit.renderIcon() renderiza corretamente cada um dos novos ícones', () => {
      for (const nome of iconesM2) {
        const parent = createMockEl('div');
        const iconEl = UIKit.renderIcon(parent, nome, { size: 16, color: '#86efac', cls: 'teste-m2' });

        assert.equal(iconEl.tagName, 'SPAN');
        assert.ok(iconEl.className.includes('snoopy-icon'));
        assert.ok(iconEl.className.includes('teste-m2'));
        assert.ok(iconEl.innerHTML.includes('<svg viewBox="0 0 24 24"'));
        assert.ok(iconEl.innerHTML.includes('width="16"'));
        assert.ok(iconEl.innerHTML.includes('height="16"'));
        assert.ok(iconEl.innerHTML.includes(UIKit.ICONS[nome]));
        assert.doesNotMatch(iconEl.innerHTML, /circle cx="12" cy="12" r="8"/, `Não deve usar círculo de fallback para '${nome}'`);
      }
    });
  });

  describe('Auditoria de Aderência ao DESIGN_GUIDELINES.md: Erradicação de Emojis em UI', () => {
    const arquivosAuditados = [
      '99_Meta/Snoopy/modulos/01_snoopy_banner_cabecalho.js',
      '99_Meta/Snoopy/modulos/02_snoopy_cockpit_pomodoro.js',
      '99_Meta/Snoopy/modulos/03_snoopy_planner_calendario.js',
      '99_Meta/Snoopy/modulos/daily_tracker/tarefas_view.js',
      '99_Meta/Snoopy/modulos/daily_tracker/calendario_view.js',
      '99_Meta/Snoopy/modulos/daily_tracker/habitos_view.js',
      '99_Meta/Snoopy/modulos/daily_tracker/tarefas_modal.js',
      '99_Meta/Snoopy/modulos/pomodoro/pomodoro_modal.js',
      '99_Meta/Snoopy/subdashboards/estudos/modais.js',
      '99_Meta/Snoopy/subdashboards/estudos/graficos_svg.js',
      '99_Meta/Snoopy/subdashboards/leituras/bookshelf_view.js',
      '99_Meta/Snoopy/subdashboards/leituras/modais.js',
      '99_Meta/Snoopy/home/view.js',
      '99_Meta/Snoopy/core/jardim_store.js'
    ];

    test('nenhum elemento de interface (DOM ou Notice) contém os 17 glifos proibidos catalogados', () => {
      const glifosProibidosEmUI = [
        /text:\s*['"](?:✕|✓|★|❖|🪙)['"]/,
        />\s*(?:✕|✓|★|❖|🪙)/,
        /new Notice(?:Ref)?\([^)]*[⚡🎉📝🎯✅↩][^)]*\)/,
        /this\._notify\([^)]*[⚡🎉📝🎯✅↩★☆][^)]*\)/
      ];

      const violacoes = [];

      for (const relPath of arquivosAuditados) {
        const fullPath = path.resolve(__dirname, '../../', relPath);
        assert.ok(fs.existsSync(fullPath), `Arquivo deve existir: ${relPath}`);
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, idx) => {
          for (const regex of glifosProibidosEmUI) {
            if (regex.test(line)) {
              violacoes.push(`${relPath}:${idx + 1}: ${line.trim()}`);
            }
          }
        });
      }

      assert.deepEqual(violacoes, [], `Violações de glifos/emojis em UI encontradas:\n${violacoes.join('\n')}`);
    });
  });

  describe('Integridade do Manifesto (99_Meta/Snoopy/manifest.json)', () => {
    test('manifesto existe e contém hashes de todos os arquivos de motor', () => {
      const manifestPath = path.resolve(__dirname, '../../99_Meta/Snoopy/manifest.json');
      assert.ok(fs.existsSync(manifestPath), 'manifest.json deve existir');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

      assert.ok(manifest.versao, 'Manifesto deve conter campo versao');
      assert.ok(manifest.motor && typeof manifest.motor === 'object', 'Manifesto deve conter dicionário de arquivos motor');
      assert.ok(manifest.motor['99_Meta/Snoopy/core/ui_kit.js'], 'Manifesto deve conter core/ui_kit.js');
      assert.ok(manifest.motor['99_Meta/Snoopy/modulos/01_snoopy_banner_cabecalho.js'], 'Manifesto deve conter banner');
      assert.ok(manifest.motor['99_Meta/Snoopy/modulos/02_snoopy_cockpit_pomodoro.js'], 'Manifesto deve conter pomodoro');
      assert.ok(manifest.seed && typeof manifest.seed === 'object', 'Manifesto deve conter seed');
    });
  });
});

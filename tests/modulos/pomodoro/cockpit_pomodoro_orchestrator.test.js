/**
 * Snoopy Vault - Testes Unitários do Orquestrador Cockpit Pomodoro
 * Executado nativamente via `node --test`.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createMockEl, carregarModulo } = require('../../helpers/test_utils.js');
const UIKit = require('../../../99_Meta/Snoopy/core/ui_kit.js');

describe('Módulo 02 - Cockpit Pomodoro Orquestrador (02_snoopy_cockpit_pomodoro.js)', () => {
  const moduloPomodoro = carregarModulo('99_Meta/Snoopy/modulos/02_snoopy_cockpit_pomodoro.js');

  test('Exporta identificador e método render', () => {
    assert.strictEqual(moduloPomodoro.id, 'snoopy_cockpit_pomodoro');
    assert.strictEqual(moduloPomodoro.titulo, 'Pomodoro Cockpit & Histórico');
    assert.strictEqual(typeof moduloPomodoro.render, 'function');
  });

  test('Renderiza cockpit pomodoro e jardim de constância na grade dupla', async () => {
    const root = createMockEl('div');

    const mockApp = {
      vault: {
        getAbstractFileByPath: (relPath) => {
          const fullPath = path.resolve(__dirname, '../../../', relPath);
          return fs.existsSync(fullPath) ? { path: relPath } : null;
        },
        read: async (file) => {
          const fullPath = path.resolve(__dirname, '../../../', file.path);
          return fs.readFileSync(fullPath, 'utf8');
        }
      }
    };

    const mockEvents = {
      listeners: {},
      on: (evt, handler) => {
        if (!mockEvents.listeners[evt]) mockEvents.listeners[evt] = [];
        mockEvents.listeners[evt].push(handler);
        return () => {};
      },
      emit: () => {}
    };

    const mockCtx = {
      root,
      app: mockApp,
      now: new Date(2026, 9, 24),
      padTime: (n) => String(n).padStart(2, '0'),
      todayStr: '2026-10-24',
      dailyPath: '01_Inbox/Diário/2026-10-24.md',
      garantirNotaDiaria: async () => ({ path: '01_Inbox/Diário/2026-10-24.md' }),
      mapaFoco: { '2026-10-24': 3 },
      completedCyclesToday: 3,
      events: mockEvents,
      config: {
        tempo_foco: 25,
        tempo_pausa_curta: 5,
        meta_ciclos_diarios: 4
      },
      UIKit,
      renderIcon: (el, name, opts) => UIKit.renderIcon(el, name, opts),
      ModalFactory: require('../../../99_Meta/Snoopy/core/modal_factory.js'),
      VaultStore: require('../../../99_Meta/Snoopy/core/vault_store.js')
    };

    await moduloPomodoro.render(mockCtx);

    const topGrid = root.querySelector('.snoopy-top-grid');
    assert.ok(topGrid, 'Grade superior de 2 colunas deve existir');
    assert.strictEqual(topGrid.children.length, 2, 'Deve conter Cockpit e Jardim');

    function findText(el, text) {
      if (el.innerText && el.innerText.includes(text)) return true;
      if (el.innerHTML && el.innerHTML.includes(text)) return true;
      return el.children.some(c => findText(c, text));
    }

    // Coluna 1: Cockpit
    const colCockpit = topGrid.children[0];
    assert.ok(findText(colCockpit, 'POMODORO'));
    assert.ok(findText(colCockpit, 'Sessão de foco e intervalo'));

    // Verificações de padronização profissional e eliminação de ruídos
    assert.strictEqual(colCockpit.querySelector('#snoopy-mode-badge'), null, 'Badge redundante FOCO ATIVO deve ser removida do topo');
    assert.strictEqual(findText(colCockpit, 'Automação de ciclo e playlist sequencial'), false, 'Rodapé estático deve ser removido');
    assert.strictEqual(findText(colCockpit, 'Sincronizado'), false, 'Texto Sincronizado deve ser removido');

    // Verificação dos campos padronizados de Foco e Pausa
    const cfgFocus = colCockpit.querySelector('#cfg-focus');
    const cfgBreak = colCockpit.querySelector('#cfg-break');
    assert.ok(cfgFocus, 'Campo de foco deve existir');
    assert.ok(cfgBreak, 'Campo de pausa deve existir');
    assert.ok(cfgFocus.classList.contains('snoopy-time-chip-input'), 'Campo de foco deve possuir classe de chip padronizado');
    assert.ok(cfgBreak.classList.contains('snoopy-time-chip-input'), 'Campo de pausa deve possuir classe de chip padronizado');

    // Verificação do anel ampliado e meta diária
    const svgBox = colCockpit.querySelector('.snoopy-circle-box');
    assert.ok(svgBox, 'Contêiner do círculo SVG ampliado deve existir');
    const metaTracker = colCockpit.querySelector('.snoopy-daily-tracker-box');
    assert.ok(metaTracker, 'Painel ampliado de meta diária deve existir');

    // Coluna 2: Jardim de Constância
    const colJardim = topGrid.children[1];
    assert.ok(findText(colJardim, 'JARDIM DE CONSTÂNCIA'));
    assert.ok(findText(colJardim, 'Histórico e ciclos acumulados'));
    assert.strictEqual(findText(colJardim, 'Constância Ativa'), false, 'Rodapé estático Constância Ativa deve ser removido');
    assert.ok(colJardim.querySelector('.snoopy-heat-grid'), 'Grade de heatmap deve existir');
    assert.ok(colJardim.querySelector('#metric-total'), 'Métrica total histórico deve existir integrada');
  });
});

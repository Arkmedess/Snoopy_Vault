/**
 * Snoopy Vault - Testes Unitários do Orquestrador Daily Tracker
 * Executado nativamente via `node --test`.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createMockEl, carregarModulo, createMockDataview } = require('../../helpers/test_utils.js');
const UIKit = require('../../../99_Meta/Snoopy/core/ui_kit.js');

describe('Módulo 04 - Daily Tracker Orquestrador (04_snoopy_daily_tracker.js)', () => {
  const moduloDailyTracker = carregarModulo('99_Meta/Snoopy/modulos/04_snoopy_daily_tracker.js');

  test('Exporta identificador e método render', () => {
    assert.strictEqual(moduloDailyTracker.id, 'snoopy_daily_tracker');
    assert.strictEqual(moduloDailyTracker.titulo, 'Hábitos & Central de Tarefas');
    assert.strictEqual(typeof moduloDailyTracker.render, 'function');
  });

  test('Compõe grid de Hábitos e Central de Tarefas integrando os submódulos', async () => {
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
      emit: (evt, data) => {
        (mockEvents.listeners[evt] || []).forEach(fn => fn(data));
      }
    };

    const mockDv = createMockDataview([]);

    const mockCtx = {
      root,
      app: mockApp,
      dv: mockDv,
      todayStr: '2026-10-24',
      dailyPath: '01_Inbox/Diário/2026-10-24.md',
      garantirNotaDiaria: async () => ({ path: '01_Inbox/Diário/2026-10-24.md' }),
      events: mockEvents,
      UIKit,
      renderIcon: (el, name, opts) => UIKit.renderIcon(el, name, opts),
      DateUtils: require('../../../99_Meta/Snoopy/core/date_utils.js'),
      VaultStore: require('../../../99_Meta/Snoopy/core/vault_store.js'),
      ModalFactory: require('../../../99_Meta/Snoopy/core/modal_factory.js')
    };

    await moduloDailyTracker.render(mockCtx);

    const hubGrid = root.querySelector('.snoopy-daily-hub-grid');
    assert.ok(hubGrid, 'Grid principal do Daily Tracker deve existir');
    assert.strictEqual(hubGrid.children.length, 2, 'Deve conter coluna de Hábitos (30%) e Tarefas (70%)');

    function findText(el, text) {
      if (el.innerText && el.innerText.includes(text)) return true;
      if (el.innerHTML && el.innerHTML.includes(text)) return true;
      return el.children.some(c => findText(c, text));
    }

    // Coluna 1: Hábitos
    const colHabitos = hubGrid.children[0];
    assert.ok(findText(colHabitos, 'HÁBITOS') || findText(colHabitos, 'Rituais diários'));

    // Coluna 2: Tarefas
    const colTarefas = hubGrid.children[1];
    assert.ok(findText(colTarefas, 'TAREFAS') || findText(colTarefas, 'O que precisa sair hoje'));
  });
});

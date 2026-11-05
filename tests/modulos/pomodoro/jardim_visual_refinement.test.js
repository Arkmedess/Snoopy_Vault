/**
 * Snoopy Vault - Testes do Refinamento Visual do Jardim da Constância
 * Executado nativamente via `node --test`.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createMockEl, carregarModulo } = require('../../helpers/test_utils.js');
const PomodoroJardim = require('../../../99_Meta/Snoopy/modulos/pomodoro/pomodoro_jardim.js');
const UIKit = require('../../../99_Meta/Snoopy/core/ui_kit.js');

describe('Jardim da Constância - Refinamento Visual & Affordance (TDD)', () => {
  test('atualizarVisualPlanta() renderiza o Mini-Bosque do Dia em #snoopy-today-grove-strip', () => {
    const root = createMockEl('div');
    const plantCard = root.createEl('div', { attr: { id: 'snoopy-plant-preview-card' } });
    plantCard.createEl('div', { attr: { id: 'snoopy-plant-avatar' } });
    plantCard.createEl('span', { attr: { id: 'snoopy-stage-title' } });
    plantCard.createEl('span', { attr: { id: 'snoopy-stage-badge' } });
    plantCard.createEl('div', { attr: { id: 'snoopy-stage-next-chip' } });
    plantCard.createEl('div', { attr: { id: 'snoopy-plant-bar' } });
    plantCard.createEl('span', { attr: { id: 'snoopy-card-taxa-foco' } });
    plantCard.createEl('div', { attr: { id: 'snoopy-today-grove-strip' } });

    // Cenário 1: 0 ciclos hoje (sem ruído textual redundante)
    PomodoroJardim.atualizarVisualPlanta(root, {
      completedCyclesToday: 0,
      dailyGoal: 4,
      focusMin: 25,
      sessoesHoje: [],
      renderIcon: (el, name, opts) => UIKit.renderIcon(el, name, opts),
      arvoreAtiva: 'sprout'
    });

    const stripEl = root.querySelector('#snoopy-today-grove-strip');
    assert.ok(stripEl, 'Container do Mini-Bosque deve existir');
    assert.strictEqual(stripEl.innerHTML.includes('dormente'), false, 'Não deve exibir texto prolixo ou redundante sem ciclos');

    // Cenário 2: 3 ciclos concluídos hoje com sessões
    const sessoes = [
      { titulo: 'Capítulo 1', hora: '10:00', min: 25 },
      { titulo: 'Exercícios', hora: '10:40', min: 25 },
      { titulo: 'Revisão', hora: '11:20', min: 25 }
    ];

    PomodoroJardim.atualizarVisualPlanta(root, {
      completedCyclesToday: 3,
      dailyGoal: 4,
      focusMin: 25,
      sessoesHoje: sessoes,
      renderIcon: (el, name, opts) => UIKit.renderIcon(el, name, opts),
      arvoreAtiva: 'cherry'
    });

    const avatarEl = root.querySelector('#snoopy-plant-avatar');
    assert.ok(avatarEl.getAttribute('style')?.includes('#f472b6') || avatarEl.getAttribute('data-tree') === 'cherry', 'Avatar deve incorporar a identidade visual da árvore equipada');
    assert.ok(stripEl.innerHTML.includes('Capítulo 1') || stripEl.innerHTML.includes('snoopy-mini-tree-chip') || stripEl.children.length >= 3, 'Mini bosque deve renderizar as árvores cultivadas hoje');
  });

  test('02_snoopy_cockpit_pomodoro.js renderiza badge de moedas de seiva no cabeçalho do Jardim', async () => {
    const moduloPomodoro = carregarModulo('99_Meta/Snoopy/modulos/02_snoopy_cockpit_pomodoro.js');
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
      on: () => () => {},
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
      mapaFoco: { '2026-10-24': 2 },
      completedCyclesToday: 2,
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
    assert.ok(topGrid);
    const colJardim = topGrid.children[1];

    // O badge de moedas deve estar presente no cabeçalho do Jardim
    const moedasBadge = colJardim.querySelector('#snoopy-jardim-moedas') || colJardim.querySelector('.snoopy-moedas-badge');
    assert.ok(moedasBadge, 'Badge de moedas de seiva deve ser renderizado no cabeçalho do Jardim');

    const moedasVal = colJardim.querySelector('#snoopy-moedas-val');
    assert.ok(moedasVal, 'Span #snoopy-moedas-val deve existir para atualização em tempo real');

    // O strip do Mini-Bosque deve estar no card do preview
    const groveStrip = colJardim.querySelector('#snoopy-today-grove-strip');
    assert.ok(groveStrip, 'Mini-bosque do dia deve estar integrado no card do Jardim');

    // O chip de taxa de ganho deve estar no card do preview
    const taxaChip = colJardim.querySelector('#snoopy-card-taxa-foco');
    assert.ok(taxaChip, 'Chip de taxa de foco por ciclo deve estar presente no card');
  });

  test('Layout do Jardim agrupa planta no topo e expande histórico verticalmente', async () => {
    const moduloPomodoro = carregarModulo('99_Meta/Snoopy/modulos/02_snoopy_cockpit_pomodoro.js');
    const root = createMockEl('div');

    const mockApp = {
      vault: {
        getAbstractFileByPath: () => null,
        read: async () => ''
      }
    };

    const mockEvents = {
      listeners: {},
      on: () => () => {},
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
      mapaFoco: { '2026-10-24': 2 },
      completedCyclesToday: 2,
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

    const colJardim = root.querySelector('.snoopy-top-grid').children[1];
    const topSection = colJardim.querySelector('.snoopy-history-top-section');
    assert.ok(topSection, 'historyTopSection deve existir agrupando cabeçalho e planta');
    
    const plantInTop = topSection.querySelector('#snoopy-plant-preview-card');
    assert.ok(plantInTop, 'O card da planta deve estar agrupado dentro do container do topo');

    const historySplit = colJardim.querySelector('.snoopy-history-split');
    assert.ok(historySplit, 'O historySplit deve existir');
    assert.ok(historySplit.getAttribute('style')?.includes('flex: 1'), 'historySplit deve possuir flex: 1 para ocupar toda a altura');

    const gridMetricsRow = colJardim.querySelector('.snoopy-grid-metrics-row');
    assert.ok(gridMetricsRow, 'Grade de heatmap e métricas deve existir');

    const metricWeek = colJardim.querySelector('#metric-week');
    assert.ok(metricWeek, 'Métrica Semana deve estar presente');
    const metricPeak = colJardim.querySelector('#metric-peak');
    assert.ok(metricPeak, 'Métrica Maior Foco deve estar presente');
    const metricStreak = colJardim.querySelector('#metric-streak');
    assert.ok(metricStreak, 'Métrica Sequência deve estar presente');
  });
});

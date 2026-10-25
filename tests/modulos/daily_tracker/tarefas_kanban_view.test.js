/**
 * Snoopy Vault - Testes do Modo Kanban na Central de Tarefas (tarefas_view.js)
 * Executado nativamente via `node --test`.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createMockEl, createMockDataview } = require('../../helpers/test_utils.js');
const TarefasView = require('../../../99_Meta/Snoopy/modulos/daily_tracker/tarefas_view.js');
const DateUtils = require('../../../99_Meta/Snoopy/core/date_utils.js');
const TaskParser = require('../../../99_Meta/Snoopy/core/task_parser.js');
const UIKit = require('../../../99_Meta/Snoopy/core/ui_kit.js');

describe('TarefasView - Modo de Visualização Kanban', () => {
  test('Renderiza seletor de visualização e alterna entre Lista e Kanban por status', async () => {
    const tasksCard = createMockEl('div');

    const mockPages = [
      {
        file: {
          path: '02_Projetos/Sprint.md',
          name: 'Sprint',
          folder: '02_Projetos',
          tasks: [
            {
              text: 'Planejar sprint #kanban 📅 2026-10-24 ⏫',
              completed: false,
              path: '02_Projetos/Sprint.md',
              line: 10
            }
          ]
        }
      },
      {
        file: {
          path: '01_Inbox/Diário/2026-10-24.md',
          name: '2026-10-24',
          folder: '01_Inbox',
          tasks: [
            {
              text: 'Ler 30 páginas #leitura ⚡ 10/30 págs 📅 2026-10-24',
              completed: false,
              path: '01_Inbox/Diário/2026-10-24.md',
              line: 15
            },
            {
              text: 'Configurar ambiente ✅ 2026-10-24',
              completed: true,
              path: '01_Inbox/Diário/2026-10-24.md',
              line: 5
            }
          ]
        }
      },
      {
        file: {
          path: '03_Estudos/CleanCode.md',
          name: 'CleanCode',
          folder: '03_Estudos',
          tasks: [
            {
              text: 'Refatorar módulo legado 📅 2026-10-28',
              completed: false,
              path: '03_Estudos/CleanCode.md',
              line: 20
            }
          ]
        }
      }
    ];

    const mockDv = createMockDataview(mockPages);
    const mockEvents = { on: () => () => {}, emit: () => {} };

    const ctx = {
      app: { workspace: { openLinkText: () => {} } },
      dv: mockDv,
      todayStr: '2026-10-24',
      DateUtils,
      TaskParser,
      UIKit,
      events: mockEvents,
      renderIcon: (el, name) => {
        el.setAttribute('data-icon', name);
        return el;
      }
    };

    const controller = await TarefasView.montar({
      tasksCard,
      ctx,
      abrirModalNovaTarefa: () => {},
      abrirModalTemplateTarefa: () => {},
      abrirModalMenuTarefa: () => {}
    });

    // 1. Verifica presença do alternador de visualização
    const switcher = tasksCard.querySelector('.snoopy-view-switcher');
    assert.ok(switcher, 'Deve existir um componente snoopy-view-switcher no cabeçalho');

    const btnLista = switcher.querySelector('[data-mode="lista"]');
    const btnKanban = switcher.querySelector('[data-mode="kanban"]');
    const btnCalendario = switcher.querySelector('[data-mode="calendario"]');
    assert.ok(btnLista, 'Botão de modo Lista deve existir');
    assert.ok(btnKanban, 'Botão de modo Kanban deve existir');
    assert.ok(btnCalendario, 'Botão de modo Calendário deve existir');

    // 2. Verifica estabilidade de posição das abas (sempre visíveis e fixas no topo)
    const tabs = tasksCard.querySelector('.snoopy-task-tabs');
    assert.ok(tabs, 'Barra de abas HOJE, AMANHÃ deve existir');
    assert.notStrictEqual(tabs.style.display, 'none', 'Abas não devem ser ocultadas para evitar saltos de layout');

    // 3. Alterna para o modo Kanban
    assert.strictEqual(typeof btnKanban.onclick, 'function');
    btnKanban.onclick();

    // Abas continuam na mesma posição estável
    assert.notStrictEqual(tabs.style.display, 'none', 'Abas continuam fixas no topo no modo Kanban');

    const kanbanBoard = tasksCard.querySelector('.snoopy-task-kanban-board');
    assert.ok(kanbanBoard, 'Quadro Kanban deve ser renderizado no container de tarefas');

    // 4. Verifica as 3 colunas de status do Kanban
    const colunas = kanbanBoard.querySelectorAll('.snoopy-task-kanban-col');
    assert.strictEqual(colunas.length, 3, 'Deve conter 3 colunas: A Fazer, Hoje / Em Andamento e Concluído');

    // 5. Verifica se os cards possuem tags de origem, quantitativo e botões de ação
    const cardKanban = kanbanBoard.querySelector('.snoopy-task-kanban-card');
    assert.ok(cardKanban, 'Deve renderizar cards dentro das colunas do Kanban');
    assert.ok(cardKanban.querySelector('.snoopy-btn-task-focus'), 'Card pendente no Kanban deve ter botão Foco');

    // 6. Alterna para o modo Calendário
    assert.strictEqual(typeof btnCalendario.onclick, 'function');
    btnCalendario.onclick();
    assert.notStrictEqual(tabs.style.display, 'none', 'Abas continuam fixas no topo no modo Calendário');
    const calWrap = tasksCard.querySelector('.snoopy-task-calendar-view-wrap');
    assert.ok(calWrap, 'Container do Calendário deve ser renderizado no modo Calendário');
  });
});

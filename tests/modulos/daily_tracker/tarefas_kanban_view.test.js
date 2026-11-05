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

    // 1. Verifica presença do alternador de visualização (apenas Lista e Kanban)
    const switcher = tasksCard.querySelector('.snoopy-view-switcher');
    assert.ok(switcher, 'Deve existir um componente snoopy-view-switcher no cabeçalho');

    const btnLista = switcher.querySelector('[data-mode="lista"]');
    const btnKanban = switcher.querySelector('[data-mode="kanban"]');
    assert.ok(btnLista, 'Botão de modo Lista deve existir');
    assert.ok(btnKanban, 'Botão de modo Kanban deve existir');
    assert.strictEqual(Boolean(switcher.querySelector('[data-mode="calendario"]')), false, 'Modo Calendário não deve mais existir no switcher');

    // 2. No modo Lista inicial, a barra de abas HOJE, AMANHÃ está visível
    const tabs = tasksCard.querySelector('.snoopy-task-tabs');
    assert.ok(tabs, 'Barra de abas HOJE, AMANHÃ deve existir');
    assert.notStrictEqual(tabs.style.display, 'none', 'Abas devem estar visíveis no modo Lista');

    // 3. Alterna para o modo Kanban: as abas HOJE/AMANHÃ/etc. devem ser removidas/ocultadas
    assert.strictEqual(typeof btnKanban.onclick, 'function');
    btnKanban.onclick();

    assert.strictEqual(tabs.style.display, 'none', 'No modo Kanban, as abas HOJE/AMANHÃ devem ser ocultadas para dar foco total ao quadro');

    const kanbanBoard = tasksCard.querySelector('.snoopy-task-kanban-board');
    assert.ok(kanbanBoard, 'Quadro Kanban deve ser renderizado no container de tarefas');

    // 4. Verifica as 3 colunas de status do Kanban
    const colunas = kanbanBoard.querySelectorAll('.snoopy-task-kanban-col');
    assert.strictEqual(colunas.length, 3, 'Deve conter 3 colunas: A Fazer, Hoje / Em Andamento e Concluído');

    // 5. Verifica se os cards possuem tags de origem, quantitativo e suporte a drag & drop
    const cardKanban = kanbanBoard.querySelector('.snoopy-task-kanban-card');
    assert.ok(cardKanban, 'Deve renderizar cards dentro das colunas do Kanban');
    assert.strictEqual(cardKanban.getAttribute('draggable'), 'true', 'Card deve possuir draggable=true para permitir arrasto');
    assert.ok(cardKanban.querySelector('.snoopy-btn-task-focus'), 'Card pendente no Kanban deve ter botão Foco');

    // 6. Retorna para o modo Lista (reexibe abas normalmente)
    assert.strictEqual(typeof btnLista.onclick, 'function');
    btnLista.onclick();
    assert.notStrictEqual(tabs.style.display, 'none', 'Abas devem reaparecer no modo Lista');
  });

  test('Permite mover cards segurando e arrastando entre as colunas do Kanban', async () => {
    const tasksCard = createMockEl('div');

    const mockPages = [
      {
        file: {
          path: '02_Projetos/Sprint.md',
          name: 'Sprint',
          folder: '02_Projetos',
          tasks: [
            {
              text: 'Desenhar diagrama de arquitetura',
              completed: false,
              path: '02_Projetos/Sprint.md',
              line: 10
            }
          ]
        }
      }
    ];

    const mockDv = createMockDataview(mockPages);
    let linhaSubstituida = null;
    let arquivoModificado = null;

    const mockVaultStore = {
      substituirLinha: async (app, file, matchFn, replaceFn) => {
        arquivoModificado = file.path;
        linhaSubstituida = replaceFn(`- [ ] ${mockPages[0].file.tasks[0].text}`);
      }
    };

    const mockApp = {
      workspace: { openLinkText: () => {} },
      vault: {
        getAbstractFileByPath: (p) => ({ path: p })
      }
    };

    const ctx = {
      app: mockApp,
      dv: mockDv,
      todayStr: '2026-10-24',
      DateUtils,
      TaskParser,
      VaultStore: mockVaultStore,
      UIKit,
      events: { on: () => () => {}, emit: () => {} },
      renderIcon: (el, name) => {
        el.setAttribute('data-icon', name);
        return el;
      }
    };

    await TarefasView.montar({
      tasksCard,
      ctx,
      abrirModalNovaTarefa: () => {},
      abrirModalTemplateTarefa: () => {},
      abrirModalMenuTarefa: () => {}
    });

    const switcher = tasksCard.querySelector('.snoopy-view-switcher');
    const btnKanban = switcher.querySelector('[data-mode="kanban"]');
    btnKanban.onclick();

    const kanbanBoard = tasksCard.querySelector('.snoopy-task-kanban-board');
    assert.ok(kanbanBoard);

    const colAFazer = kanbanBoard.querySelector('.col-afazer');
    const colHoje = kanbanBoard.querySelector('.col-hoje');
    const colConcluido = kanbanBoard.querySelector('.col-concluido');
    assert.ok(colAFazer);
    assert.ok(colHoje);
    assert.ok(colConcluido);

    const card = colAFazer.querySelector('.snoopy-task-kanban-card');
    assert.ok(card, 'Card deve existir na coluna A Fazer');

    // Simula evento de arrasto (dragstart) no card
    const dragStore = {};
    const mockDataTransfer = {
      setData: (type, val) => { dragStore[type] = val; },
      getData: (type) => dragStore[type] || ''
    };

    card.dispatchEvent('dragstart', { dataTransfer: mockDataTransfer });
    assert.ok(dragStore['text/plain'], 'dragstart deve popular o payload no dataTransfer');

    // Simula soltar (drop) na coluna "HOJE"
    const cardsWrapHoje = colHoje.querySelector('.snoopy-task-kanban-col-cards');
    cardsWrapHoje.dispatchEvent('drop', { dataTransfer: mockDataTransfer });
    await new Promise(r => setTimeout(r, 15));

    assert.ok(linhaSubstituida, 'substituirLinha deve ter sido executado ao soltar o card');
    assert.strictEqual(arquivoModificado, '02_Projetos/Sprint.md');
    assert.ok(linhaSubstituida.includes('📅 2026-10-24'), 'Mover para HOJE deve adicionar a data de hoje na tarefa');
    assert.ok(cardsWrapHoje.querySelector('.snoopy-task-kanban-card'), 'Card deve ser transferido otimisticamente para o DOM da coluna Hoje');

    // Simula soltar (drop) na coluna "CONCLUÍDO"
    const cardsWrapConcluido = colConcluido.querySelector('.snoopy-task-kanban-col-cards');
    cardsWrapConcluido.dispatchEvent('drop', { dataTransfer: mockDataTransfer });
    await new Promise(r => setTimeout(r, 15));
    assert.ok(linhaSubstituida.includes('- [x] ✅ 2026-10-24'), 'Mover para CONCLUÍDO deve concluir a tarefa');
    assert.ok(cardsWrapConcluido.querySelector('.snoopy-task-kanban-card'), 'Card deve ser transferido otimisticamente para o DOM da coluna Concluído');
  });
});

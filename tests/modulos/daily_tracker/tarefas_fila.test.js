/**
 * Snoopy Vault - Testes Unitários de Enfileiramento de Tarefas no Pomodoro (Playlist)
 * Executado nativamente via `node --test`.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createMockEl, carregarModulo, createMockDataview } = require('../../helpers/test_utils.js');
const DateUtils = require('../../../99_Meta/Snoopy/core/date_utils.js');
const TaskParser = require('../../../99_Meta/Snoopy/core/task_parser.js');

describe('Submódulo: TarefasView - Enfileirar na Playlist de Pomodoro (tarefas_view.js)', () => {
  const TarefasView = carregarModulo('99_Meta/Snoopy/modulos/daily_tracker/tarefas_view.js');

  test('Emite evento pomodoro:enfileirar ao clicar no botão de fila da tarefa', async () => {
    const tasksCard = createMockEl('div');
    let eventoRecebido = null;

    const mockEvents = {
      on: () => () => {},
      emit: (evt, data) => {
        if (evt === 'pomodoro:enfileirar') {
          eventoRecebido = data;
        }
      }
    };

    const mockPages = [
      {
        file: {
          path: '02_Projetos/Projeto.md',
          name: 'Projeto',
          tasks: [
            { text: 'Implementar Algoritmo Dijkstra 🍅 2 📅 2026-10-24', completed: false, path: '02_Projetos/Projeto.md', line: 12 }
          ]
        }
      }
    ];

    const mockCtx = {
      app: {},
      dv: createMockDataview(mockPages),
      todayStr: '2026-10-24',
      DateUtils,
      TaskParser,
      VaultStore: {},
      events: mockEvents
    };

    await TarefasView.montar({
      tasksCard,
      ctx: mockCtx,
      abrirModalNovaTarefa: () => {},
      abrirModalTemplateTarefa: () => {},
      abrirModalMenuTarefa: () => {}
    });

    const listBox = tasksCard.querySelector('.snoopy-tasks-list-box');
    assert.ok(listBox, 'Lista de tarefas deve existir');

    const card = listBox.querySelector('.snoopy-task-card');
    assert.ok(card, 'Card da tarefa deve existir');

    // Valida padronização do botão de foco compacto
    const btnFoco = card.querySelector('.snoopy-btn-task-focus');
    assert.ok(btnFoco, 'Botão Foco deve usar a classe compacta e refinada .snoopy-btn-task-focus');

    // Localiza o botão com title de fila ou texto +Fila
    const btnFila = card.querySelector('button[title*="Fila"]') || card.querySelector('button[title*="Playlist"]');
    assert.ok(btnFila, 'Botão de enfileirar na playlist deve existir');

    btnFila.onclick({ stopPropagation: () => {} });

    assert.ok(eventoRecebido, 'Evento pomodoro:enfileirar deve ser emitido');
    assert.strictEqual(eventoRecebido.titulo, 'Implementar Algoritmo Dijkstra');
    assert.strictEqual(eventoRecebido.path, '02_Projetos/Projeto.md');
    assert.strictEqual(eventoRecebido.line, 12);
    assert.strictEqual(eventoRecebido.pomosTotal, 2);
  });
});

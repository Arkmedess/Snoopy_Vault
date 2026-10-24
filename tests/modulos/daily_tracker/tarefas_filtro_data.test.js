/**
 * Snoopy Vault - Testes Unitários de Filtro de Tarefas por Data via Calendário
 * Executado nativamente via `node --test`.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createMockEl, carregarModulo, createMockDataview } = require('../../helpers/test_utils.js');
const DateUtils = require('../../../99_Meta/Snoopy/core/date_utils.js');
const TaskParser = require('../../../99_Meta/Snoopy/core/task_parser.js');

describe('Submódulo: TarefasView - Filtro por Data (tarefas_view.js)', () => {
  const TarefasView = carregarModulo('99_Meta/Snoopy/modulos/daily_tracker/tarefas_view.js');

  test('Filtra tarefas quando o evento tarefas:filtrar-data é disparado', async () => {
    const tasksCard = createMockEl('div');

    const listeners = {};
    const mockEvents = {
      on: (evt, fn) => {
        if (!listeners[evt]) listeners[evt] = [];
        listeners[evt].push(fn);
        return () => {
          listeners[evt] = listeners[evt].filter(f => f !== fn);
        };
      },
      emit: (evt, data) => {
        (listeners[evt] || []).forEach(fn => fn(data));
      }
    };

    const mockPages = [
      {
        file: {
          path: '02_Projetos/Projeto.md',
          name: 'Projeto',
          tasks: [
            { text: 'Tarefa do dia 25 📅 2026-10-25', completed: false, path: '02_Projetos/Projeto.md' },
            { text: 'Tarefa de hoje 📅 2026-10-24', completed: false, path: '02_Projetos/Projeto.md' },
            { text: 'Tarefa antiga 📅 2026-10-10', completed: false, path: '02_Projetos/Projeto.md' }
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

    // Inicialmente na aba "HOJE", deve listar a tarefa de hoje e a atrasada (antiga)
    assert.ok(listBox.innerText.includes('Tarefa de hoje'));
    assert.ok(!listBox.innerText.includes('Tarefa do dia 25'));

    // Dispara o evento de filtro para o dia 25
    mockEvents.emit('tarefas:filtrar-data', { data: '2026-10-25' });

    // Agora deve exibir a tarefa do dia 25 e o chip de filtro ativo
    assert.ok(listBox.innerText.includes('Tarefa do dia 25'));
    assert.ok(!listBox.innerText.includes('Tarefa de hoje'));
    assert.ok(listBox.innerText.includes('Filtrando por data:'));
    assert.ok(listBox.innerText.includes('25/10/2026'));

    // Testa o botão limpar filtro
    const chipBox = listBox.querySelector('.snoopy-task-filter-active-chip');
    assert.ok(chipBox, 'Chip de filtro deve existir');
    const btnLimpar = chipBox.querySelector('button');
    assert.ok(btnLimpar, 'Botão de limpar filtro deve existir');

    btnLimpar.onclick();

    // Após limpar, volta para a visualização normal (aba hoje)
    assert.ok(listBox.innerText.includes('Tarefa de hoje'));
    assert.ok(!listBox.innerText.includes('Tarefa do dia 25'));
    assert.ok(!listBox.querySelector('.snoopy-task-filter-active-chip'), 'Chip de filtro deve ser removido');
  });
});

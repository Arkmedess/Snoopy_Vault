/**
 * Snoopy Vault - Testes Unitários do Calendário Mensal Interativo
 * Executado nativamente via `node --test`.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createMockEl, carregarModulo, createMockDataview } = require('../../helpers/test_utils.js');
const DateUtils = require('../../../99_Meta/Snoopy/core/date_utils.js');

describe('Submódulo: CalendarioView (calendario_view.js)', () => {
  const CalendarioView = carregarModulo('99_Meta/Snoopy/modulos/daily_tracker/calendario_view.js');

  test('Exporta objeto com método montar()', () => {
    assert.strictEqual(typeof CalendarioView.montar, 'function');
  });

  test('Renderiza cabeçalho, dias da semana e células do mês', async () => {
    const container = createMockEl('div');
    const mockEvents = {
      emit: () => {}
    };

    const mockPages = [
      {
        file: {
          path: '02_Projetos/Projeto Alpha.md',
          name: 'Projeto Alpha',
          tasks: [
            { text: 'Concluir wireframes 📅 2026-10-24', completed: false },
            { text: 'Validar protótipo 📅 2026-10-25', completed: true },
            { text: 'Revisão técnica 📅 2026-10-10', completed: false }
          ]
        }
      }
    ];

    const mockCtx = {
      app: {},
      dv: createMockDataview(mockPages),
      todayStr: '2026-10-24',
      DateUtils,
      events: mockEvents
    };

    const instancia = await CalendarioView.montar({
      container,
      ctx: mockCtx
    });

    const calBox = container.querySelector('.snoopy-cal-box');
    assert.ok(calBox, 'Deve criar o container .snoopy-cal-box');

    const header = calBox.querySelector('.snoopy-cal-header');
    assert.ok(header, 'Deve conter cabeçalho do calendário');
    assert.ok(header.innerText.includes('2026'), 'Deve exibir o ano atual');

    const grid = calBox.querySelector('.snoopy-cal-grid');
    assert.ok(grid, 'Deve conter a grade de dias');

    // Verifica se os dias da semana existem
    const weekdays = grid.children.filter(c => c.classList.contains('snoopy-cal-weekday'));
    assert.strictEqual(weekdays.length, 7, 'Deve exibir 7 dias da semana (D S T Q Q S S)');

    // Verifica se os dias do mês foram gerados
    const dayCells = grid.children.filter(c => c.classList.contains('snoopy-cal-day'));
    assert.ok(dayCells.length >= 28, 'Deve conter ao menos 28 células de dias');

    // Verifica que existe uma célula marcada como "today"
    const todayCell = grid.children.find(c => c.classList.contains('today'));
    assert.ok(todayCell, 'Deve destacar a célula de hoje');
    assert.strictEqual(todayCell.innerText.trim(), '24');

    // Verifica se há micro-indicadores (dots) nas datas com tarefas
    const dots = calBox.querySelectorAll ? calBox.querySelectorAll('.snoopy-cal-dot') : [];
    assert.ok(dots.length > 0 || grid.children.some(c => c.children.some(ch => ch.classList.contains('snoopy-cal-dot'))), 'Deve renderizar dots indicadores');

    assert.strictEqual(typeof instancia.recarregar, 'function');
    assert.strictEqual(typeof instancia.obterDataSelecionada, 'function');
  });

  test('Dispara evento e callback ao clicar em uma data do calendário', async () => {
    const container = createMockEl('div');
    let eventoDisparado = null;
    let callbackData = null;

    const mockEvents = {
      emit: (nome, payload) => {
        if (nome === 'tarefas:filtrar-data') {
          eventoDisparado = payload;
        }
      }
    };

    const mockCtx = {
      app: {},
      dv: createMockDataview([]),
      todayStr: '2026-10-24',
      DateUtils,
      events: mockEvents
    };

    await CalendarioView.montar({
      container,
      ctx: mockCtx,
      onSelectData: (d) => {
        callbackData = d;
      }
    });

    const grid = container.querySelector('.snoopy-cal-grid');
    const dayCells = grid.children.filter(c => c.classList.contains('snoopy-cal-day') && !c.classList.contains('other-month'));

    // Clica no dia 24
    const cell24 = dayCells.find(c => c.innerText.trim() === '24');
    assert.ok(cell24, 'Célula do dia 24 deve existir');

    cell24.onclick();

    assert.deepStrictEqual(eventoDisparado, { data: '2026-10-24' });
    assert.strictEqual(callbackData, '2026-10-24');

    // Clica novamente no mesmo dia para desmarcar
    cell24.onclick();
    assert.deepStrictEqual(eventoDisparado, { data: null });
    assert.strictEqual(callbackData, null);
  });
});

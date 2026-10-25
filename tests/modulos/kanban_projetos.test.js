/**
 * Snoopy Vault - Testes Unitários do Módulo 03: Kanban de Iniciativas
 * Executado nativamente via `node --test`.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createMockEl, carregarModulo, createMockDataview } = require('../helpers/test_utils.js');
const UIKit = require('../../99_Meta/Snoopy/core/ui_kit.js');

describe('Módulo 03 - Kanban de Iniciativas (03_snoopy_kanban_projetos)', () => {
  const moduloKanban = carregarModulo('99_Meta/Snoopy/modulos/03_snoopy_kanban_projetos.js');

  test('Exporta identificador e método render', () => {
    assert.strictEqual(moduloKanban.id, 'snoopy_kanban_projetos');
    assert.strictEqual(moduloKanban.titulo, 'Kanban de Iniciativas');
    assert.strictEqual(typeof moduloKanban.render, 'function');
  });

  test('Renderiza cabeçalho, alternador de escopo e colunas padrão com cartões', async () => {
    const root = createMockEl('div');

    const mockProjetos = [
      {
        file: { name: 'Projeto Alpha', path: '02_Projetos/Projeto Alpha.md', folder: '02_Projetos' },
        status: 'Em Andamento',
        prioridade: 'Alta',
        progresso: 50
      },
      {
        file: { name: 'Projeto Beta', path: '02_Projetos/Projeto Beta.md', folder: '02_Projetos' },
        status: 'Planejamento',
        prioridade: 'Média'
      },
      {
        file: { name: 'Template - Projeto', path: '02_Projetos/Template - Projeto.md', folder: '02_Projetos' }
      }
    ];

    const mockDv = createMockDataview(mockProjetos);

    const mockApp = {
      vault: {
        getAbstractFileByPath: () => null,
        read: async () => '[]'
      },
      workspace: {
        openLinkText: () => {}
      }
    };

    const mockCtx = {
      root,
      app: mockApp,
      dv: mockDv,
      todayStr: '2026-10-24',
      UIKit,
      renderIcon: (el, name, opts) => UIKit.renderIcon(el, name, opts)
    };

    await moduloKanban.render(mockCtx);

    // 1. Validação do Cabeçalho e Subtítulo
    const section = root.querySelector('.snoopy-kanban-section');
    assert.ok(section, 'Seção do kanban deve existir');

    const header = section.querySelector('.snoopy-card-header');
    assert.ok(header);
    assert.ok(header.innerHTML.includes('KANBAN'));
    assert.ok(header.innerHTML.includes('Fluxo contínuo de iniciativas'));

    // 2. Validação dos botões de alternância de escopo
    const scopePills = header.querySelector('#kanban-scope-pills');
    assert.ok(scopePills);
    const btnProjetos = scopePills.querySelector('#scope-btn-projetos');
    const btnEstudos = scopePills.querySelector('#scope-btn-estudos');
    const btnTodos = scopePills.querySelector('#scope-btn-todos');
    assert.ok(btnProjetos);
    assert.ok(btnEstudos);
    assert.ok(btnTodos);
    assert.ok(btnProjetos.classList.contains('active'));

    // 3. Validação das Colunas Renderizadas
    const colsGrid = section.querySelector('.snoopy-kanban-cols');
    assert.ok(colsGrid);
    assert.strictEqual(colsGrid.children.length, 3); // Em Andamento, Planejamento, Concluído

    function findText(el, text) {
      if (el.innerText && el.innerText.includes(text)) return true;
      if (el.innerHTML && el.innerHTML.includes(text)) return true;
      return el.children.some(c => findText(c, text));
    }

    // Coluna 1: Em Andamento deve ter 1 card (Projeto Alpha)
    const colAndamento = colsGrid.children[0];
    assert.ok(findText(colAndamento, 'Em Andamento'));
    assert.ok(findText(colAndamento, 'Projeto Alpha'));

    // Coluna 2: Planejamento deve ter 1 card (Projeto Beta)
    const colPlanejamento = colsGrid.children[1];
    assert.ok(findText(colPlanejamento, 'Planejamento'));
    assert.ok(findText(colPlanejamento, 'Projeto Beta'));

    // Coluna 3: Concluído deve exibir estado vazio
    const colConcluido = colsGrid.children[2];
    assert.ok(findText(colConcluido, 'Concluído'));
    assert.ok(findText(colConcluido, 'Nenhum item nesta coluna'));

    // 4. Testar alternância de escopo para "Estudos"
    btnEstudos.dispatchEvent('click');
    assert.ok(btnEstudos.classList.contains('active'));
    assert.ok(!btnProjetos.classList.contains('active'));
  });

  test('Renderiza tarefas com #kanban e atividades não registradas no escopo de Atividades', async () => {
    const root = createMockEl('div');

    const mockPages = [
      {
        file: {
          name: 'Diário 2026-10-24',
          path: '01_Inbox/Diário/2026-10-24.md',
          tasks: [
            { text: 'Comprar suprimentos do laboratório #kanban 📅 2026-10-25 ⏫', completed: false, path: '01_Inbox/Diário/2026-10-24.md' },
            { text: 'Estudo autônomo não registrado no inbox', completed: false, path: '01_Inbox/Diário/2026-10-24.md' },
            { text: 'Atividade concluída no kanban #kanban', completed: true, path: '01_Inbox/Diário/2026-10-24.md' }
          ]
        }
      }
    ];

    const mockDv = createMockDataview(mockPages);

    const mockApp = {
      vault: {
        getAbstractFileByPath: () => null,
        read: async () => '[]'
      },
      workspace: {
        openLinkText: () => {}
      }
    };

    const mockCtx = {
      root,
      app: mockApp,
      dv: mockDv,
      todayStr: '2026-10-24',
      UIKit,
      renderIcon: (el, name, opts) => UIKit.renderIcon(el, name, opts)
    };

    await moduloKanban.render(mockCtx);

    const btnAtividades = root.querySelector('#scope-btn-atividades');
    assert.ok(btnAtividades, 'Botão de escopo Atividades deve existir');

    btnAtividades.dispatchEvent('click');
    assert.ok(btnAtividades.classList.contains('active'));
    await new Promise(r => setTimeout(r, 20));

    const section = root.querySelector('.snoopy-kanban-section');
    const colsGrid = section.querySelector('.snoopy-kanban-cols');
    assert.ok(colsGrid);

    function findText(el, text) {
      if (el.innerText && el.innerText.includes(text)) return true;
      if (el.innerHTML && el.innerHTML.includes(text)) return true;
      return el.children.some(c => findText(c, text));
    }

    // A tarefa de suprimentos deve estar na coluna de Planejamento ou Em Andamento
    const colPlanejamento = colsGrid.children[1];
    assert.ok(findText(colPlanejamento, 'Comprar suprimentos do laboratório'));

    // A tarefa concluída deve estar na coluna Concluído
    const colConcluido = colsGrid.children[2];
    assert.ok(findText(colConcluido, 'Atividade concluída no kanban'));
  });
});

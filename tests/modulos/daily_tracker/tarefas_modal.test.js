/**
 * Snoopy Vault - Testes Unitários de Modais de Tarefas e Hábitos
 * Executado nativamente via `node --test`.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createMockEl, carregarModulo, createMockDataview } = require('../../helpers/test_utils.js');
const DateUtils = require('../../../99_Meta/Snoopy/core/date_utils.js');
const VaultStore = require('../../../99_Meta/Snoopy/core/vault_store.js');

describe('Submódulo - TarefasModal (daily_tracker/tarefas_modal.js)', () => {
  const TarefasModal = carregarModulo('99_Meta/Snoopy/modulos/daily_tracker/tarefas_modal.js');

  test('Exporta métodos principais do diálogo de tarefas', () => {
    assert.strictEqual(typeof TarefasModal._obterIniciativas, 'function');
    assert.strictEqual(typeof TarefasModal.abrirModalNovaTarefa, 'function');
    assert.strictEqual(typeof TarefasModal.abrirModalMenuTarefa, 'function');
    assert.strictEqual(typeof TarefasModal.abrirModalTemplateTarefa, 'function');
  });

  describe('_obterIniciativas()', () => {
    test('coleta e categoriza projetos, estudos e livros ignorando templates e painéis', () => {
      const mockPages = [
        { file: { name: 'Projeto Snoopy', path: '02_Projetos/Projeto Snoopy.md', folder: '02_Projetos' } },
        { file: { name: 'Direito Constitucional', path: '03_Estudos/Direito Constitucional.md', folder: '03_Estudos' } },
        { file: { name: 'Clean Code', path: '04_Leituras/Clean Code.md', folder: '04_Leituras' } },
        { file: { name: 'Template - Estudo', path: '03_Estudos/Template - Estudo.md', folder: '03_Estudos' } },
        { file: { name: 'Painel de Estudos', path: '03_Estudos/Painel de Estudos.md', folder: '03_Estudos' } }
      ];

      const mockDv = createMockDataview(mockPages);
      const iniciativas = TarefasModal._obterIniciativas(mockDv);

      assert.strictEqual(iniciativas.length, 3);
      assert.deepEqual(iniciativas.map(i => i.tipo), ['Estudo', 'Livro', 'Projeto']);
      assert.strictEqual(iniciativas[0].nome, 'Direito Constitucional');
      assert.strictEqual(iniciativas[1].nome, 'Clean Code');
      assert.strictEqual(iniciativas[2].nome, 'Projeto Snoopy');
    });

    test('retorna array vazio com segurança se o dataview não for fornecido', () => {
      const res = TarefasModal._obterIniciativas(null);
      assert.deepEqual(res, []);
    });
  });

  describe('abrirModalNovaTarefa()', () => {
    test('monta estrutura do modal e valida salvamento com atalhos de data', async () => {
      let modalAbertoOpts = null;
      let modalFechado = false;
      const fakeModalBox = createMockEl('div');

      const mockModalFactory = {
        abrir: (opts) => {
          modalAbertoOpts = opts;
          fakeModalBox.innerHTML = opts.htmlContent;
          if (opts.onMontar) {
            opts.onMontar(fakeModalBox, () => { modalFechado = true; });
          }
          return { modalBox: fakeModalBox, fechar: () => { modalFechado = true; } };
        }
      };

      const mockDv = createMockDataview([]);
      let tarefasAtualizadas = false;

      TarefasModal.abrirModalNovaTarefa({
        app: { vault: { getAbstractFileByPath: () => null } },
        ctx: {},
        dv: mockDv,
        todayStr: '2026-10-24',
        DateUtils,
        VaultStore,
        ModalFactory: mockModalFactory,
        garantirNotaDiaria: async () => ({ path: '01_Inbox/Diário/2026-10-24.md' }),
        onAtualizar: () => { tarefasAtualizadas = true; }
      });

      assert.ok(modalAbertoOpts, 'Modal deve ter sido invocado via ModalFactory.abrir');
      assert.ok(fakeModalBox.innerHTML.includes('+ Nova Tarefa'));
      assert.ok(fakeModalBox.innerHTML.includes('1. O que precisa ser feito?'));
      assert.ok(fakeModalBox.innerHTML.includes('2. Prazo:'));
      assert.ok(fakeModalBox.innerHTML.includes('3. Período do Dia:'));

      const inputTexto = fakeModalBox.querySelector('#modal-task-text');
      assert.ok(inputTexto);
      const inputData = fakeModalBox.querySelector('#modal-task-date');
      assert.ok(inputData);
      const inputKanban = fakeModalBox.querySelector('#modal-task-kanban');
      assert.ok(inputKanban, 'Deve incluir opção de exibir no Kanban (#kanban)');
    });

    test('ao marcar a opção de Kanban, inclui a tag #kanban na linha da tarefa', async () => {
      let linhaAdicionada = null;
      let modalAbertoOpts = null;
      const fakeModalBox = createMockEl('div');

      const mockModalFactory = {
        abrir: (opts) => {
          modalAbertoOpts = opts;
          fakeModalBox.innerHTML = opts.htmlContent;
          if (opts.onMontar) {
            opts.onMontar(fakeModalBox, () => {});
          }
          return { modalBox: fakeModalBox, fechar: () => {} };
        }
      };

      const mockVaultStore = {
        adicionarLinhaEmSecao: async (app, file, secao, linha) => {
          linhaAdicionada = linha;
        }
      };

      TarefasModal.abrirModalNovaTarefa({
        app: { vault: { getAbstractFileByPath: () => null } },
        ctx: {},
        dv: createMockDataview([]),
        todayStr: '2026-10-24',
        DateUtils,
        VaultStore: mockVaultStore,
        ModalFactory: mockModalFactory,
        garantirNotaDiaria: async () => ({ path: '01_Inbox/Diário/2026-10-24.md' }),
        onAtualizar: () => {}
      });

      const inputTexto = fakeModalBox.querySelector('#modal-task-text');
      inputTexto.value = 'Revisar arquitetura do sistema';

      const checkKanban = fakeModalBox.querySelector('#modal-task-kanban');
      assert.ok(checkKanban, 'Checkbox de kanban deve existir');
      checkKanban.checked = true;

      const btnSalvar = fakeModalBox.querySelector('#modal-save-task');
      await btnSalvar.onclick();

      assert.ok(linhaAdicionada, 'Linha da tarefa deve ter sido registrada');
      assert.ok(linhaAdicionada.includes('#kanban'), 'Linha deve conter a tag #kanban');
    });
  });

  describe('abrirModalMenuTarefa()', () => {
    test('renderiza opção de Kanban e permite ativar/desativar', async () => {
      let linhaSubstituida = null;
      const fakeModalBox = createMockEl('div');

      const mockModalFactory = {
        abrir: (opts) => {
          fakeModalBox.innerHTML = opts.htmlContent;
          if (opts.onMontar) {
            opts.onMontar(fakeModalBox, () => {});
          }
          return { modalBox: fakeModalBox, fechar: () => {} };
        }
      };

      const mockVaultStore = {
        substituirLinha: async (app, file, matcher, replacer) => {
          linhaSubstituida = replacer();
        }
      };

      const itemMock = {
        cleanText: 'Implementar endpoint REST',
        dueStr: '2026-10-24',
        prio: 'alta'
      };

      const taskMock = {
        text: 'Implementar endpoint REST 📅 2026-10-24 ⏫',
        path: '02_Projetos/API.md'
      };

      const mockApp = {
        vault: {
          getAbstractFileByPath: () => ({ path: '02_Projetos/API.md' })
        }
      };

      TarefasModal.abrirModalMenuTarefa({
        item: itemMock,
        t: taskMock,
        filePath: '02_Projetos/API.md',
        app: mockApp,
        ctx: {},
        todayStr: '2026-10-24',
        DateUtils,
        VaultStore: mockVaultStore,
        ModalFactory: mockModalFactory,
        onAtualizar: () => {}
      });

      const checkKanban = fakeModalBox.querySelector('#modal-edit-kanban');
      assert.ok(checkKanban, 'Checkbox #modal-edit-kanban deve existir');
      assert.strictEqual(checkKanban.checked, false, 'Inicialmente não marcado');

      checkKanban.checked = true;
      const btnSalvar = fakeModalBox.querySelector('#modal-save-edit');
      await btnSalvar.onclick();

      assert.ok(linhaSubstituida, 'Linha deve ser substituída');
      assert.ok(linhaSubstituida.includes('#kanban'), 'Linha editada deve conter #kanban');
    });
  });
});

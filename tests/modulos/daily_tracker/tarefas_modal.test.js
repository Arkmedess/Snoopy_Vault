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
        app: {},
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
    });
  });
});

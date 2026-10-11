/**
 * Snoopy Vault - Testes Unitários de VaultStore
 * Valida a manipulação de conteúdo Markdown sem dependência direta do Obsidian.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const VaultStore = require('../../99_Meta/Snoopy/core/vault_store.js');

describe('VaultStore - Manipulação Segura de Notas Markdown', () => {
  // Mock do ambiente app.vault
  function criarAppMock(conteudoInicial = '') {
    let conteudo = conteudoInicial;
    let lixeira = [];

    const file = { path: 'teste.md' };
    const app = {
      vault: {
        read: async (f) => conteudo,
        modify: async (f, novoConteudo) => { conteudo = novoConteudo; },
        trash: async (f, sistema) => { lixeira.push(f.path); },
        getAbstractFileByPath: (p) => (p === file.path ? file : null)
      }
    };

    return {
      app,
      file,
      getConteudo: () => conteudo,
      getLixeira: () => lixeira
    };
  }

  describe('adicionarLinhaEmSecao()', () => {
    test('adiciona linha abaixo de seção H2 existente', async () => {
      const mock = criarAppMock('# Nota\n\n## Hábitos\n- [ ] Ler 20m\n\n## Outros');
      await VaultStore.adicionarLinhaEmSecao(mock.app, mock.file, 'Hábitos', '- [ ] Meditar');
      assert.equal(mock.getConteudo(), '# Nota\n\n## Hábitos\n- [ ] Meditar\n- [ ] Ler 20m\n\n## Outros');
    });

    test('cria a seção H2 caso ela não exista no documento', async () => {
      const mock = criarAppMock('# Nota Diária');
      await VaultStore.adicionarLinhaEmSecao(mock.app, mock.file, 'Tarefas', '- [ ] Tarefa Nova');
      assert.equal(mock.getConteudo(), '# Nota Diária\n\n## Tarefas\n- [ ] Tarefa Nova\n');
    });
  });

  describe('substituirLinha()', () => {
    test('substitui linha que atende ao predicado', async () => {
      const mock = criarAppMock('- [ ] Tarefa 1\n- [ ] Tarefa 2\n- [ ] Tarefa 3');
      await VaultStore.substituirLinha(
        mock.app,
        mock.file,
        line => line.includes('Tarefa 2'),
        line => line.replace('- [ ]', '- [x]')
      );
      assert.equal(mock.getConteudo(), '- [ ] Tarefa 1\n- [x] Tarefa 2\n- [ ] Tarefa 3');
    });

    test('não modifica arquivo se nenhuma linha atender ao predicado', async () => {
      const mock = criarAppMock('- [ ] Tarefa 1');
      await VaultStore.substituirLinha(
        mock.app,
        mock.file,
        line => line.includes('Inexistente'),
        line => 'Novo'
      );
      assert.equal(mock.getConteudo(), '- [ ] Tarefa 1');
    });
  });

  describe('removerLinha()', () => {
    test('remove linhas que atendem ao predicado', async () => {
      const mock = criarAppMock('Linha 1\nLinha a remover\nLinha 3');
      await VaultStore.removerLinha(
        mock.app,
        mock.file,
        line => line.includes('remover')
      );
      assert.equal(mock.getConteudo(), 'Linha 1\nLinha 3');
    });
  });

  describe('excluirArquivo()', () => {
    test('envia arquivo existente para a lixeira', async () => {
      const mock = criarAppMock('conteudo');
      await VaultStore.excluirArquivo(mock.app, 'teste.md');
      assert.deepEqual(mock.getLixeira(), ['teste.md']);
    });
  });
});


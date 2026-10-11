/**
 * Snoopy Vault - Testes Unitários de Detecção e Limpeza de Mocks
 * Executado nativamente via `node --test`.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const MockManager = require('../../99_Meta/Snoopy/core/mock_manager.js');

describe('MockManager - Detecção e Limpeza Segura de Exemplos', () => {
  test('detectarMocks() identifica apenas notas com prefixo "Exemplo - "', async () => {
    const arquivos = [
      { path: '02_Projetos/Exemplo - Estruturar Meu Vault.md', basename: 'Exemplo - Estruturar Meu Vault' },
      { path: '02_Projetos/Meu Projeto Real.md', basename: 'Meu Projeto Real' },
      { path: '03_Estudos/Exemplo - Arquitetura de Software.md', basename: 'Exemplo - Arquitetura de Software' }
    ];

    const mockApp = {
      vault: {
        getMarkdownFiles: () => arquivos
      }
    };

    const mocks = await MockManager.detectarMocks(mockApp);
    assert.equal(mocks.length, 2);
    assert.ok(mocks.some(m => m.path.includes('Estruturar Meu Vault')));
    assert.ok(!mocks.some(m => m.path.includes('Meu Projeto Real')));
  });

  test('removerMocks() apaga apenas arquivos de exemplo e zera ciclo de estudos', async () => {
    let lixeira = [];
    let cicloModificado = '';

    const arquivos = [
      { path: '02_Projetos/Exemplo - Teste.md', basename: 'Exemplo - Teste' },
      { path: '01_Inbox/Minha Nota Real.md', basename: 'Minha Nota Real' }
    ];

    const mockApp = {
      vault: {
        getMarkdownFiles: () => arquivos,
        trash: async (file) => { lixeira.push(file.path); },
        getAbstractFileByPath: (p) => arquivos.find(a => a.path === p) || (p === '99_Meta/ciclo-estudos.json' ? { path: p } : null),
        modify: async (f, c) => { cicloModificado = c; }
      }
    };

    const res = await MockManager.removerMocks(mockApp);
    assert.equal(res.sucesso, true);
    assert.deepEqual(lixeira, ['02_Projetos/Exemplo - Teste.md']);
    assert.ok(cicloModificado.includes('"cicloOrdem": []'));
  });

  test('restaurarMocks() recria arquivos de exemplo ausentes e restaura ciclo de demonstração', async () => {
    const criados = [];
    let cicloModificado = '';

    const mockApp = {
      vault: {
        getAbstractFileByPath: (p) => p === '99_Meta/ciclo-estudos.json' ? { path: p } : null,
        create: async (path, content) => { criados.push(path); },
        modify: async (f, c) => { cicloModificado = c; }
      }
    };

    const res = await MockManager.restaurarMocks(mockApp);
    assert.equal(res.sucesso, true);
    assert.ok(criados.includes('02_Projetos/Exemplo - Estruturar Meu Vault.md'));
    assert.ok(criados.includes('03_Estudos/Exemplo - Arquitetura de Software.md'));
    assert.ok(criados.includes('04_Leituras/Livros/Exemplo - Hábitos Atômicos - James Clear.md'));
    assert.ok(cicloModificado.includes('Exemplo - Arquitetura de Software'));
  });
});

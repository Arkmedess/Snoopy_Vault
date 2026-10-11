import { test } from 'node:test';
import assert from 'node:assert/strict';
import ModuleLoader from '../../99_Meta/Snoopy/core/module_loader.js';

test('ModuleLoader - carrega código e reutiliza cache enquanto mtime for idêntico', async () => {
  ModuleLoader.limparCache();

  let compilacoes = 0;
  const mockApp = {
    vault: {
      getAbstractFileByPath: () => ({ stat: { mtime: 12345 } }),
      read: async () => {
        compilacoes++;
        return 'return { id: "teste", valor: 42 };';
      }
    }
  };

  const mod1 = await ModuleLoader.carregar(mockApp, 'teste.js');
  assert.equal(mod1.valor, 42);
  assert.equal(compilacoes, 1);

  // Segunda chamada deve usar o cache sem compilar novamente
  const mod2 = await ModuleLoader.carregar(mockApp, 'teste.js');
  assert.equal(mod2.valor, 42);
  assert.equal(compilacoes, 1);
});

test('ModuleLoader - recompila se o mtime do arquivo for modificado', async () => {
  ModuleLoader.limparCache();

  let compilacoes = 0;
  let arquivoMtime = 1000;
  const mockApp = {
    vault: {
      getAbstractFileByPath: () => ({ stat: { mtime: arquivoMtime } }),
      read: async () => {
        compilacoes++;
        return `return { versao: ${arquivoMtime} };`;
      }
    }
  };

  const v1 = await ModuleLoader.carregar(mockApp, 'versao.js');
  assert.equal(v1.versao, 1000);
  assert.equal(compilacoes, 1);

  arquivoMtime = 2000;
  const v2 = await ModuleLoader.carregar(mockApp, 'versao.js');
  assert.equal(v2.versao, 2000);
  assert.equal(compilacoes, 2);
});


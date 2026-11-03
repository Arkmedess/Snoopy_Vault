const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Updater = require('../../99_Meta/Snoopy/core/updater.js');

describe('Updater - Verificação Remota e Construção de Mapa Local', () => {
  test('construirMapaLocal(app) lê manifest.json e mapeia hashes em disco', async () => {
    const arquivos = {
      '99_Meta/Snoopy/manifest.json': JSON.stringify({
        versao: '0.9.0',
        motor: {
          '99_Meta/Snoopy/core/vault_store.js': 'sha256:abc123'
        }
      }),
      '99_Meta/Snoopy/core/vault_store.js': 'const a = 1;'
    };

    const mockApp = {
      vault: {
        getAbstractFileByPath: (p) => arquivos[p] ? { path: p } : null,
        read: async (file) => arquivos[file.path || file],
        adapter: {
          exists: async (p) => Boolean(arquivos[p]),
          read: async (p) => arquivos[p]
        }
      }
    };

    assert.strictEqual(typeof Updater.construirMapaLocal, 'function');
    const mapa = await Updater.construirMapaLocal(mockApp);
    assert.ok(typeof mapa === 'object');
    assert.ok(mapa['99_Meta/Snoopy/core/vault_store.js']);
    assert.ok(mapa['99_Meta/Snoopy/core/vault_store.js'].startsWith('sha256:'));
  });

  test('verificarAtualizacaoDisponivel(app) detecta nova versão disponível', async () => {
    const arquivos = {
      '99_Meta/Snoopy/manifest.json': JSON.stringify({
        versao: '0.8.0',
        motor: {
          '99_Meta/Snoopy/core/teste.js': 'sha256:velho'
        }
      }),
      '99_Meta/Snoopy/core/teste.js': 'codigo antigo'
    };

    const mockApp = {
      vault: {
        getAbstractFileByPath: (p) => arquivos[p] ? { path: p } : null,
        read: async (file) => arquivos[file.path || file],
        adapter: {
          exists: async (p) => Boolean(arquivos[p]),
          read: async (p) => arquivos[p]
        }
      }
    };

    const manifestoRemotoMock = {
      versao: '0.9.0',
      motor: {
        '99_Meta/Snoopy/core/teste.js': 'sha256:novo'
      }
    };

    // Injeta fetch remoto mockado
    const originalBuscar = Updater.buscarManifestoRemoto;
    Updater.buscarManifestoRemoto = async () => manifestoRemotoMock;

    try {
      assert.strictEqual(typeof Updater.verificarAtualizacaoDisponivel, 'function');
      const resultado = await Updater.verificarAtualizacaoDisponivel(mockApp);
      assert.strictEqual(resultado.disponivel, true);
      assert.strictEqual(resultado.versaoLocal, '0.8.0');
      assert.strictEqual(resultado.versaoRemota, '0.9.0');
      assert.ok(resultado.plano);
      assert.strictEqual(resultado.plano.atualizar.length, 1);
    } finally {
      Updater.buscarManifestoRemoto = originalBuscar;
    }
  });

  test('verificarAtualizacaoDisponivel(app) reporta sem atualização se versões forem idênticas', async () => {
    const arquivos = {
      '99_Meta/Snoopy/manifest.json': JSON.stringify({
        versao: '0.9.0',
        motor: {
          '99_Meta/Snoopy/core/teste.js': 'sha256:identico'
        }
      }),
      '99_Meta/Snoopy/core/teste.js': 'codigo estavel'
    };

    const hashCalculado = await Updater.calcularSha256('codigo estavel');

    const mockApp = {
      vault: {
        getAbstractFileByPath: (p) => arquivos[p] ? { path: p } : null,
        read: async (file) => arquivos[file.path || file],
        adapter: {
          exists: async (p) => Boolean(arquivos[p]),
          read: async (p) => arquivos[p]
        }
      }
    };

    const manifestoRemotoMock = {
      versao: '0.9.0',
      motor: {
        '99_Meta/Snoopy/core/teste.js': hashCalculado
      }
    };

    const originalBuscar = Updater.buscarManifestoRemoto;
    Updater.buscarManifestoRemoto = async () => manifestoRemotoMock;

    try {
      const resultado = await Updater.verificarAtualizacaoDisponivel(mockApp);
      assert.strictEqual(resultado.disponivel, false);
      assert.strictEqual(resultado.versaoLocal, '0.9.0');
      assert.strictEqual(resultado.versaoRemota, '0.9.0');
    } finally {
      Updater.buscarManifestoRemoto = originalBuscar;
    }
  });
});

/**
 * Snoopy Vault - Testes Automatizados para Comparação SemVer e Gatilho do Updater
 * Garante que nenhuma atualização seja disparada quando a versão atual for a mais recente.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const Updater = require('../../99_Meta/Snoopy/core/updater.js');

describe('Updater - SemVer e Inibição de Notificações para Versão Mais Recente', () => {
  test('compararSemver compara versões semânticas corretamente', () => {
    assert.strictEqual(typeof Updater.compararSemver, 'function', 'compararSemver deve ser uma função');

    // Iguais
    assert.strictEqual(Updater.compararSemver('0.9.1', '0.9.1'), 0);
    assert.strictEqual(Updater.compararSemver('v0.9.1', '0.9.1'), 0);
    assert.strictEqual(Updater.compararSemver('1.0.0', '1.0.0'), 0);

    // Maior
    assert.ok(Updater.compararSemver('0.9.2', '0.9.1') > 0);
    assert.ok(Updater.compararSemver('0.10.0', '0.9.1') > 0);
    assert.ok(Updater.compararSemver('1.0.0', '0.9.1') > 0);
    assert.ok(Updater.compararSemver('v1.0.1', 'v1.0.0') > 0);

    // Menor
    assert.ok(Updater.compararSemver('0.9.0', '0.9.1') < 0);
    assert.ok(Updater.compararSemver('0.9.1', '0.10.0') < 0);
    assert.ok(Updater.compararSemver('0.9.1', '1.0.0') < 0);

    // Formatos defensivos / nulos
    assert.strictEqual(Updater.compararSemver(null, '0.9.1'), -1);
    assert.strictEqual(Updater.compararSemver('0.9.1', null), 1);
  });

  test('verificarAtualizacaoDisponivel não reporta atualização quando versão local é a mais recente', async () => {
    const arquivos = {
      '99_Meta/Snoopy/manifest.json': JSON.stringify({
        versao: '0.9.1',
        motor: {
          '99_Meta/Snoopy/core/teste.js': 'sha256:hash-antigo'
        }
      }),
      // Arquivo local modificado gerando hash diferente em disco
      '99_Meta/Snoopy/core/teste.js': 'codigo modificado localmente'
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
      versao: '0.9.1',
      motor: {
        '99_Meta/Snoopy/core/teste.js': 'sha256:hash-remoto-diferente'
      }
    };

    const originalBuscar = Updater.buscarManifestoRemoto;
    Updater.buscarManifestoRemoto = async () => manifestoRemotoMock;

    try {
      const resultado = await Updater.verificarAtualizacaoDisponivel(mockApp);
      // Como versaoLocal (0.9.1) >= versaoRemota (0.9.1), não deve disparar atualização!
      assert.strictEqual(resultado.disponivel, false, 'disponivel deve ser false quando versões forem idênticas');
      assert.strictEqual(resultado.versaoLocal, '0.9.1');
      assert.strictEqual(resultado.versaoRemota, '0.9.1');
    } finally {
      Updater.buscarManifestoRemoto = originalBuscar;
    }
  });

  test('verificarAtualizacaoDisponivel não reporta atualização se versão local for mais nova que remota', async () => {
    const arquivos = {
      '99_Meta/Snoopy/manifest.json': JSON.stringify({
        versao: '0.9.2',
        motor: {}
      })
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
      versao: '0.9.1',
      motor: {}
    };

    const originalBuscar = Updater.buscarManifestoRemoto;
    Updater.buscarManifestoRemoto = async () => manifestoRemotoMock;

    try {
      const resultado = await Updater.verificarAtualizacaoDisponivel(mockApp);
      assert.strictEqual(resultado.disponivel, false, 'disponivel deve ser false quando versão local for maior que a remota');
      assert.strictEqual(resultado.versaoLocal, '0.9.2');
      assert.strictEqual(resultado.versaoRemota, '0.9.1');
    } finally {
      Updater.buscarManifestoRemoto = originalBuscar;
    }
  });

  test('verificarAtualizacaoDisponivel reporta disponível quando versão remota for estritamente mais recente', async () => {
    const arquivos = {
      '99_Meta/Snoopy/manifest.json': JSON.stringify({
        versao: '0.9.1',
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
      versao: '0.9.2',
      motor: {
        '99_Meta/Snoopy/core/teste.js': 'sha256:novo'
      }
    };

    const originalBuscar = Updater.buscarManifestoRemoto;
    Updater.buscarManifestoRemoto = async () => manifestoRemotoMock;

    try {
      const resultado = await Updater.verificarAtualizacaoDisponivel(mockApp);
      assert.strictEqual(resultado.disponivel, true, 'disponivel deve ser true quando houver versão mais recente no GitHub');
      assert.strictEqual(resultado.versaoLocal, '0.9.1');
      assert.strictEqual(resultado.versaoRemota, '0.9.2');
    } finally {
      Updater.buscarManifestoRemoto = originalBuscar;
    }
  });
});

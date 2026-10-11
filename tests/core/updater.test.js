/**
 * Snoopy Vault - Testes Unitários de Planejamento de Atualização Segura
 * Executado nativamente via `node --test`.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const Updater = require('../../99_Meta/Snoopy/core/updater.js');

describe('Updater - Planejamento Seguro de Atualização', () => {
  const manifesto = {
    versao: '0.8.0',
    motor: {
      '99_Meta/Snoopy/core/vault_store.js': 'sha_store_v2',
      '99_Meta/Snoopy/core/novo_recurso.js': 'sha_novo_v1',
      '99_Meta/Snoopy/core/date_utils.js': 'sha_date_v1'
    }
  };

  test('identifica arquivos novos para adicionar e arquivos já idênticos', () => {
    const estado = {
      versao: '0.7.0',
      arquivos: {
        '99_Meta/Snoopy/core/vault_store.js': 'sha_store_v1',
        '99_Meta/Snoopy/core/date_utils.js': 'sha_date_v1'
      }
    };
    const hashesLocais = {
      '99_Meta/Snoopy/core/vault_store.js': 'sha_store_v1',
      '99_Meta/Snoopy/core/date_utils.js': 'sha_date_v1'
    };

    const plano = Updater.planejarAtualizacao({
      manifestoRemoto: manifesto,
      estadoInstalado: estado,
      hashesLocais
    });

    assert.equal(plano.requerAtualizacao, true);
    assert.deepEqual(plano.adicionar, ['99_Meta/Snoopy/core/novo_recurso.js']);
    assert.deepEqual(plano.atualizar, ['99_Meta/Snoopy/core/vault_store.js']);
    assert.deepEqual(plano.iguais, ['99_Meta/Snoopy/core/date_utils.js']);
    assert.equal(plano.preservar.length, 0);
  });

  test('preserva arquivo que o usuário editou localmente sem sobrescrever', () => {
    const estado = {
      versao: '0.7.0',
      arquivos: {
        '99_Meta/Snoopy/core/vault_store.js': 'sha_store_v1'
      }
    };
    // Hash local difere tanto do instalado quanto do remoto: usuário editou!
    const hashesLocais = {
      '99_Meta/Snoopy/core/vault_store.js': 'sha_store_customizado_pelo_usuario'
    };

    const plano = Updater.planejarAtualizacao({
      manifestoRemoto: manifesto,
      estadoInstalado: estado,
      hashesLocais
    });

    assert.ok(plano.preservar.some(p => p.caminho === '99_Meta/Snoopy/core/vault_store.js'));
    assert.ok(!plano.atualizar.includes('99_Meta/Snoopy/core/vault_store.js'));
  });

  test('identifica arquivos obsoletos do motor para remoção/backup seguro', () => {
    const estado = {
      versao: '0.7.0',
      arquivos: {
        '99_Meta/Snoopy/core/antigo_obsoleto.js': 'sha_velho'
      }
    };
    const hashesLocais = {
      '99_Meta/Snoopy/core/antigo_obsoleto.js': 'sha_velho'
    };

    const plano = Updater.planejarAtualizacao({
      manifestoRemoto: manifesto,
      estadoInstalado: estado,
      hashesLocais
    });

    assert.deepEqual(plano.remover, ['99_Meta/Snoopy/core/antigo_obsoleto.js']);
  });
});


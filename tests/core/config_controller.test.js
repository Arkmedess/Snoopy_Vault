/**
 * Snoopy Vault - Testes Unitários do Controlador de Configurações
 * Executado nativamente via `node --test`.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const ConfigController = require('../../99_Meta/Snoopy/core/config_controller.js');

describe('ConfigController - Orquestração de Configurações e Estado do Cofre', () => {
  test('obterVersaoLocal() lê versão do manifesto ou retorna padrão v0.0.0', async () => {
    const mockApp = {
      vault: {
        getAbstractFileByPath: (p) => p === '99_Meta/Snoopy/manifest.json' ? { path: p } : null,
        read: async () => JSON.stringify({ versao: '0.8.0' })
      }
    };

    const versao = await ConfigController.obterVersaoLocal(mockApp);
    assert.equal(versao, '0.8.0');

    const appSemManifesto = {
      vault: {
        getAbstractFileByPath: () => null
      }
    };
    const versaoPadrao = await ConfigController.obterVersaoLocal(appSemManifesto);
    assert.equal(versaoPadrao, '0.0.0');
  });

  test('listarBackups() retorna lista ordenada dos backups disponíveis', async () => {
    const arquivos = [
      { path: '99_Meta/.backups/snoopy/backup-2026-10-11T10-00-00-000Z' },
      { path: '99_Meta/.backups/snoopy/backup-2026-10-11T12-00-00-000Z' },
      { path: '99_Meta/Snoopy/core/updater.js' }
    ];

    const mockApp = {
      vault: {
        getAllLoadedFiles: () => arquivos
      }
    };

    const backups = await ConfigController.listarBackups(mockApp);
    assert.equal(backups.length, 2);
    // Mais recente primeiro
    assert.equal(backups[0].id, 'backup-2026-10-11T12-00-00-000Z');
  });

  test('verificarStatus() consolida versão, contagem de mocks e histórico de backups', async () => {
    const mockApp = {
      vault: {
        getAbstractFileByPath: (p) => p === '99_Meta/Snoopy/manifest.json' ? { path: p } : null,
        read: async () => JSON.stringify({ versao: '0.8.0' }),
        getAllLoadedFiles: () => [
          { path: '99_Meta/.backups/snoopy/backup-2026-10-11T12-00-00-000Z' }
        ],
        getMarkdownFiles: () => [
          { path: '02_Projetos/Exemplo - Teste.md', basename: 'Exemplo - Teste' },
          { path: '01_Inbox/Minha Nota.md', basename: 'Minha Nota' }
        ]
      }
    };

    const status = await ConfigController.verificarStatus(mockApp);
    assert.equal(status.versao, '0.8.0');
    assert.equal(status.mocks.length, 1);
    assert.equal(status.backups.length, 1);
    assert.equal(status.ultimoBackup, 'backup-2026-10-11T12-00-00-000Z');
  });
});

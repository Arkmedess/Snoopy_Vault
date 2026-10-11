/**
 * Snoopy Vault - Testes de Execução Atômica, Backup e Rollback do Updater
 * Executado nativamente via `node --test`.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const Updater = require('../../99_Meta/Snoopy/core/updater.js');

describe('Updater - Execução Atômica, Backup e Rollback', () => {
  test('aplicarAtualizacao() cria backup antes de modificar e grava novos conteúdos', async () => {
    const arquivos = {
      '99_Meta/Snoopy/core/vault_store.js': 'conteudo_antigo'
    };

    const mockApp = {
      vault: {
        adapter: {
          read: async (p) => arquivos[p] || '',
          write: async (p, c) => { arquivos[p] = c; },
          exists: async (p) => Boolean(arquivos[p]),
          mkdir: async () => {},
          remove: async (p) => { delete arquivos[p]; },
          list: async (p) => ({ files: Object.keys(arquivos).filter(k => k.startsWith(p)) })
        }
      }
    };

    const plano = {
      versaoAlvo: '0.8.0',
      requerAtualizacao: true,
      adicionar: ['99_Meta/Snoopy/core/novo.js'],
      atualizar: ['99_Meta/Snoopy/core/vault_store.js'],
      preservar: [],
      remover: [],
      iguais: []
    };

    const conteudosRemotos = {
      '99_Meta/Snoopy/core/novo.js': 'conteudo_novo',
      '99_Meta/Snoopy/core/vault_store.js': 'conteudo_atualizado'
    };

    const res = await Updater.aplicarAtualizacao(mockApp, {
      plano,
      baixarConteudo: async (caminho) => conteudosRemotos[caminho]
    });

    assert.equal(res.sucesso, true);
    assert.equal(arquivos['99_Meta/Snoopy/core/novo.js'], 'conteudo_novo');
    assert.equal(arquivos['99_Meta/Snoopy/core/vault_store.js'], 'conteudo_atualizado');
    // Confere se o backup do arquivo antigo foi salvo
    assert.ok(Object.keys(arquivos).some(k => k.includes('.backups/snoopy') && k.endsWith('vault_store.js')));
  });

  test('aborta sem alterar nenhum arquivo se houver falha de download no meio do processo', async () => {
    const arquivos = { '99_Meta/Snoopy/core/vault_store.js': 'conteudo_original' };
    const mockApp = {
      vault: {
        adapter: {
          read: async (p) => arquivos[p] || '',
          write: async (p, c) => { arquivos[p] = c; },
          exists: async (p) => Boolean(arquivos[p]),
          mkdir: async () => {}
        }
      }
    };

    const plano = {
      adicionar: ['99_Meta/Snoopy/core/falha.js'],
      atualizar: ['99_Meta/Snoopy/core/vault_store.js'],
      preservar: [],
      remover: []
    };

    await assert.rejects(async () => {
      await Updater.aplicarAtualizacao(mockApp, {
        plano,
        baixarConteudo: async (p) => {
          if (p.includes('falha')) throw new Error('Erro 404');
          return 'ok';
        }
      });
    }, /Erro 404/);

    // O arquivo original não pode ter sido modificado!
    assert.equal(arquivos['99_Meta/Snoopy/core/vault_store.js'], 'conteudo_original');
  });

  test('preserva arquivos customizados gravando versao atualizada com sufixo .novo', async () => {
    const arquivos = {
      '99_Meta/Snoopy/core/custom.js': 'customizado_pelo_usuario'
    };
    const mockApp = {
      vault: {
        adapter: {
          read: async (p) => arquivos[p] || '',
          write: async (p, c) => { arquivos[p] = c; },
          exists: async (p) => Boolean(arquivos[p]),
          mkdir: async () => {}
        }
      }
    };

    const plano = {
      adicionar: [],
      atualizar: [],
      preservar: [{ caminho: '99_Meta/Snoopy/core/custom.js', razao: 'Editado' }],
      remover: []
    };

    await Updater.aplicarAtualizacao(mockApp, {
      plano,
      baixarConteudo: async () => 'versao_oficial_nova'
    });

    // O arquivo customizado do usuário fica 100% intocado
    assert.equal(arquivos['99_Meta/Snoopy/core/custom.js'], 'customizado_pelo_usuario');
    // A nova versão oficial é salva ao lado como .novo para comparação
    assert.equal(arquivos['99_Meta/Snoopy/core/custom.js.novo'], 'versao_oficial_nova');
  });

  test('desfazerAtualizacao() restaura os arquivos a partir do backup', async () => {
    const backupId = '20261011_teste';
    const backupDir = `99_Meta/.backups/snoopy/${backupId}`;
    const arquivos = {
      [`${backupDir}/99_Meta/Snoopy/core/vault_store.js`]: 'conteudo_original_salvo',
      '99_Meta/Snoopy/core/vault_store.js': 'conteudo_modificado'
    };

    const mockApp = {
      vault: {
        adapter: {
          read: async (p) => arquivos[p] || '',
          write: async (p, c) => { arquivos[p] = c; },
          exists: async (p) => Boolean(arquivos[p]) || Object.keys(arquivos).some(k => k.startsWith(p)),
          list: async (p) => ({
            files: Object.keys(arquivos).filter(k => k.startsWith(p)),
            folders: []
          })
        }
      }
    };

    const res = await Updater.desfazerAtualizacao(mockApp, backupId);
    assert.equal(res.sucesso, true);
    assert.equal(arquivos['99_Meta/Snoopy/core/vault_store.js'], 'conteudo_original_salvo');
  });
});

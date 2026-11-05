/**
 * Snoopy Vault - Testes Automatizados para a Funcionalidade de Limpeza de Dados
 * Valida a integridade do método ConfigController.limparDados()
 */
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const ConfigController = require('../../99_Meta/Snoopy/core/config_controller.js');

describe('ConfigController - Funcionalidade de Limpeza de Dados (limparDados)', () => {
  let storageMock;
  let arquivosMock;
  let mockApp;

  beforeEach(() => {
    storageMock = new Map([
      ['snoopy_pomodoro_timer', '{"tempo": 1200}'],
      ['snoopy_pomodoro_audio_track', 'custom_url'],
      ['snoopy_pomodoro_combo', '5'],
      ['snoopy_shop_coins', '100'],
      ['chave_externa_manter', 'valor_manter']
    ]);

    arquivosMock = {
      '99_Meta/snoopy-shop.json': JSON.stringify({
        versao: 1,
        saldo: 350,
        totalGanhosHistoricos: 500,
        colorScheme: 'light',
        ambientEnabled: true,
        desbloqueados: ['sprout', 'audio-white-noise', 'theme-preset-snoopy', 'audio-brown-noise'],
        equipados: { botanical: 'sprout', audio: 'audio-brown-noise', cosmetic: 'theme-preset-snoopy' },
        estatisticasBotanicas: { totalPlantadas: 10 },
        historicoTransacoes: [{ tipo: 'compra', valor: 50 }]
      }),
      '99_Meta/jardim-constancia.json': JSON.stringify({
        moedas: 120,
        arvoreAtiva: 'oak',
        desbloqueadas: ['sprout', 'oak'],
        totalPlantadas: 4,
        historicoCompras: ['oak']
      }),
      '99_Meta/ciclo-estudos.json': JSON.stringify({
        disciplinaAtualIdx: 3,
        cicloOrdem: ['matematica', 'historia'],
        metaHorasSemanal: 30,
        metaQuestoesSemanal: 200,
        nomeMetaProva: "Concurso",
        historicoDiario: { '2026-10-20': 4 }
      })
    };

    mockApp = {
      vault: {
        getAbstractFileByPath: (p) => arquivosMock[p] ? { path: p } : null,
        read: async (file) => arquivosMock[file.path || file],
        modify: async (file, data) => {
          arquivosMock[file.path || file] = data;
        },
        create: async (p, data) => {
          arquivosMock[p] = data;
          return { path: p };
        }
      }
    };
  });

  test('ConfigController possui método limparDados', () => {
    assert.strictEqual(typeof ConfigController.limparDados, 'function');
  });

  test('limparDados zera arquivos JSON da loja, jardim e ciclo mantendo formato canônico', async () => {
    const customStorage = {
      getItem: (k) => storageMock.get(k),
      setItem: (k, v) => storageMock.set(k, v),
      removeItem: (k) => storageMock.delete(k),
      clear: () => storageMock.clear(),
      get length() { return storageMock.size; },
      key: (i) => Array.from(storageMock.keys())[i]
    };

    const resultado = await ConfigController.limparDados(mockApp, { storage: customStorage });
    assert.strictEqual(resultado.sucesso, true);
    assert.ok(resultado.arquivosResetados.length >= 3);

    // Valida loja zerada
    const shopReset = JSON.parse(arquivosMock['99_Meta/snoopy-shop.json']);
    assert.strictEqual(shopReset.saldo, 0);
    assert.strictEqual(shopReset.totalGanhosHistoricos, 0);
    assert.deepStrictEqual(shopReset.historicoTransacoes, []);
    assert.ok(shopReset.desbloqueados.includes('sprout'));
    assert.ok(shopReset.desbloqueados.includes('audio-white-noise'));

    // Valida jardim zerado
    const jardimReset = JSON.parse(arquivosMock['99_Meta/jardim-constancia.json']);
    assert.strictEqual(jardimReset.moedas, 0);
    assert.strictEqual(jardimReset.totalPlantadas, 0);
    assert.strictEqual(jardimReset.arvoreAtiva, 'sprout');

    // Valida ciclo zerado
    const cicloReset = JSON.parse(arquivosMock['99_Meta/ciclo-estudos.json']);
    assert.strictEqual(cicloReset.disciplinaAtualIdx, 0);
    assert.deepStrictEqual(cicloReset.cicloOrdem, []);
    assert.deepStrictEqual(cicloReset.historicoDiario, {});

    // Valida que apenas chaves snoopy_* foram removidas do storage
    assert.strictEqual(storageMock.has('snoopy_pomodoro_timer'), false);
    assert.strictEqual(storageMock.has('snoopy_pomodoro_audio_track'), false);
    assert.strictEqual(storageMock.has('snoopy_shop_coins'), false);
    assert.strictEqual(storageMock.has('chave_externa_manter'), true);
  });
});

/**
 * Snoopy Vault - Milestone M4 Empirical Stress & Integrity Test Suite (Challenger M4.1)
 *
 * Verificação forense independente e stress testing adversarial da ShopStore:
 * 1. Operações de saldo extremas (negativos, fracionários, NaN, Infinity, MAX_SAFE_INTEGER).
 * 2. Condições de corrida e compras simultâneas (concorrência via Promise.all, duplicidade, double-debit).
 * 3. Casos de borda de saldo insuficiente (price - 1, balance 0, balance negativo).
 * 4. Resiliência a armazenamento corrompido (JSON malformado, chaves ausentes, campos nulos/anômalos, legado corrompido).
 * 5. Integridade do barramento de eventos (economy:balance_updated, shop:item_purchased, inventory:item_equipped).
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const SHOP_STORE_PATH = path.resolve(__dirname, '../../99_Meta/Snoopy/core/shop_store.js');

function carregarShopStore() {
  delete require.cache[require.resolve(SHOP_STORE_PATH)];
  return require(SHOP_STORE_PATH);
}

// In-memory mock Obsidian App with async delay capability for concurrency testing
function criarMockApp(dadosIniciais = null, delayMs = 1) {
  const fileStore = new Map();

  if (dadosIniciais !== null) {
    const serialized = typeof dadosIniciais === 'string' ? dadosIniciais : JSON.stringify(dadosIniciais);
    fileStore.set('99_Meta/jardim-constancia.json', serialized);
    fileStore.set('99_Meta/snoopy-shop.json', serialized);
  }

  const vault = {
    getAbstractFileByPath: (p) => {
      if (fileStore.has(p)) {
        return { path: p, name: path.basename(p) };
      }
      return null;
    },
    read: async (file) => {
      const p = typeof file === 'string' ? file : file.path;
      if (delayMs > 0) {
        await new Promise(r => setTimeout(r, delayMs));
      }
      if (!fileStore.has(p)) {
        throw new Error(`File not found: ${p}`);
      }
      return fileStore.get(p);
    },
    modify: async (file, content) => {
      const p = typeof file === 'string' ? file : file.path;
      if (delayMs > 0) {
        await new Promise(r => setTimeout(r, delayMs));
      }
      fileStore.set(p, typeof content === 'string' ? content : JSON.stringify(content));
    },
    create: async (filePath, content) => {
      if (delayMs > 0) {
        await new Promise(r => setTimeout(r, delayMs));
      }
      fileStore.set(filePath, typeof content === 'string' ? content : JSON.stringify(content));
      return { path: filePath, name: path.basename(filePath) };
    },
    _getRawStore: () => fileStore
  };

  return { vault };
}

// Mock EventBus that captures all events and payload copies
function criarMockEventBus(throwOnError = false) {
  const eventos = [];
  return {
    emit: (nome, payload) => {
      if (throwOnError) {
        throw new Error(`EventBus listener exploded on ${nome}`);
      }
      eventos.push({ nome, payload: JSON.parse(JSON.stringify(payload)) });
    },
    getEventos: () => eventos,
    limpar: () => { eventos.length = 0; }
  };
}

describe('Challenger M4.1 - Shop Economy Stress & Adversarial Suite', () => {
  let ShopStore;

  beforeEach(() => {
    ShopStore = carregarShopStore();
  });

  // =========================================================================
  // 1. Operações Extremas de Saldo
  // =========================================================================
  describe('1. Operações de Saldo Extremas e Entradas Adversariais', () => {
    test('creditarMoedas() com valores negativos não reduz o saldo nem emite delta negativo', async () => {
      const mockApp = criarMockApp({ saldo: 100 });
      const bus = criarMockEventBus();

      const saldo1 = await ShopStore.creditarMoedas(mockApp, -50, 'debito_adversarial', bus);
      assert.strictEqual(saldo1, 100, 'Saldo não deve diminuir ao passar valor negativo');
      assert.strictEqual(ShopStore.obterSaldo(mockApp), 100);

      const eventos = bus.getEventos();
      assert.strictEqual(eventos.length, 1);
      assert.strictEqual(eventos[0].payload.delta, 0, 'Delta emitido para crédito negativo deve ser 0');
      assert.strictEqual(eventos[0].payload.saldoAtual, 100);
    });

    test('creditarMoedas() com NaN, Infinity, -Infinity e tipos adversariais é estritamente contido', async () => {
      const mockApp = criarMockApp({ saldo: 50 });
      const bus = criarMockEventBus();

      const adversariais = [NaN, Infinity, -Infinity, 'muitas_moedas', null, undefined, {}, []];

      for (const input of adversariais) {
        const saldo = await ShopStore.creditarMoedas(mockApp, input, 'adversarial', bus);
        assert.ok(Number.isFinite(saldo), `Saldo deve ser número finito para input ${input}`);
        assert.strictEqual(saldo >= 50, true, `Saldo nunca deve ficar menor que o original para input ${input}`);
      }
      assert.strictEqual(ShopStore.obterSaldo(mockApp), 50, 'Saldo deve permanecer 50 após inputs inválidos');
    });

    test('creditarMoedas() lida com valores fracionários sem gerar NaN', async () => {
      const mockApp = criarMockApp({ saldo: 0 });
      await ShopStore.creditarMoedas(mockApp, 10.5);
      assert.strictEqual(ShopStore.obterSaldo(mockApp), 10);

      // Compra com saldo fracionário normalizado: Sakura custa 50, saldo 10 -> deve recusar
      const fail = await ShopStore.comprarItem(mockApp, 'flower-2');
      assert.strictEqual(fail.sucesso, false);
      assert.strictEqual(fail.erro, 'INSUFFICIENT_FUNDS');
    });

    test('creditarMoedas() sob limite Number.MAX_SAFE_INTEGER não quebra o sistema', async () => {
      const mockApp = criarMockApp({ saldo: Number.MAX_SAFE_INTEGER - 10 });
      const saldo = await ShopStore.creditarMoedas(mockApp, 5);
      assert.strictEqual(saldo, Number.MAX_SAFE_INTEGER - 5);
      assert.ok(Number.isSafeInteger(saldo));
    });

    test('creditarFoco() sob minutos e combos adversariais (negativo, NaN, Infinity, strings)', async () => {
      const mockApp = criarMockApp(null);

      // Minutos negativos ou zero
      const rZero = await ShopStore.creditarFoco(mockApp, 0, 1);
      assert.strictEqual(rZero.moedasGanhas, 1);

      // Minutos NaN
      const rNan = await ShopStore.creditarFoco(mockApp, NaN, NaN);
      assert.ok(Number.isFinite(rNan.moedasGanhas));
      assert.strictEqual(rNan.moedasGanhas >= 1, true);

      // Combo gigante ou string
      const rCombo = await ShopStore.creditarFoco(mockApp, 25, 99999);
      assert.strictEqual(rCombo.bonusCombo, 3, 'Combo >= 10 deve ter teto máximo de bônus 3');
      assert.strictEqual(rCombo.moedasGanhas, 8); // 5 base + 3 bonus
    });
  });

  // =========================================================================
  // 2. Condições de Corrida e Compras Simultâneas (Concurrency Stress)
  // =========================================================================
  describe('2. Condições de Corrida e Concorrência (Race Conditions)', () => {
    test('compras simultâneas do MESMO item via Promise.all não causam duplo débito nem duplicação em desbloqueados', async () => {
      // O usuário possui 100 moedas e tenta comprar o 'tree-pine' (preço 100) duas vezes no mesmo microssegundo
      const mockApp = criarMockApp({
        saldo: 100,
        desbloqueados: ['sprout', 'audio-white-noise', 'theme-preset-snoopy']
      }, 5); // 5ms async delay per I/O

      const bus = criarMockEventBus();

      // Dispara 2 compras em paralelo estrito
      const [res1, res2] = await Promise.all([
        ShopStore.comprarItem(mockApp, 'tree-pine', bus),
        ShopStore.comprarItem(mockApp, 'tree-pine', bus)
      ]);

      const sucessos = [res1, res2].filter(r => r.sucesso);
      const falhas = [res1, res2].filter(r => !r.sucesso);

      // Apenas UMA compra pode ter sucesso
      assert.strictEqual(sucessos.length, 1, `Esperava exatamente 1 sucesso, mas obteve ${sucessos.length}`);
      assert.strictEqual(falhas.length, 1, `Esperava exatamente 1 falha, mas obteve ${falhas.length}`);

      // Saldo final deve ser exatamente 0 (debitou 100 apenas uma vez)
      const estadoFinal = await ShopStore.carregar(mockApp);
      assert.strictEqual(estadoFinal.saldo, 0, `Saldo esperado 0, obteve ${estadoFinal.saldo}`);

      // Item 'tree-pine' deve constar exatamente UMA vez na lista de desbloqueados
      const ocorrenciasTreePine = estadoFinal.desbloqueados.filter(id => id === 'tree-pine').length;
      assert.strictEqual(ocorrenciasTreePine, 1, `Item tree-pine deve aparecer exatamente 1 vez, apareceu ${ocorrenciasTreePine}`);

      // Evento de compra deve ter sido emitido exatamente 1 vez
      const eventosCompra = bus.getEventos().filter(e => e.nome === 'shop:item_purchased');
      assert.strictEqual(eventosCompra.length, 1, `Evento shop:item_purchased deve ser emitido 1 vez, foi emitido ${eventosCompra.length}`);
    });

    test('compras simultâneas de ITENS DISTINTOS quando o saldo permite apenas um não deixam o saldo negativo', async () => {
      // Usuário tem 100 moedas.
      // Item A: 'tree-pine' (100)
      // Item B: 'audio-brown-noise' (80)
      // Total se ambos passassem: 180 (impossível para saldo 100)
      const mockApp = criarMockApp({
        saldo: 100,
        desbloqueados: ['sprout', 'audio-white-noise', 'theme-preset-snoopy']
      }, 5);

      const bus = criarMockEventBus();

      const [resA, resB] = await Promise.all([
        ShopStore.comprarItem(mockApp, 'tree-pine', bus),
        ShopStore.comprarItem(mockApp, 'audio-brown-noise', bus)
      ]);

      const sucessos = [resA, resB].filter(r => r.sucesso);
      const falhas = [resA, resB].filter(r => !r.sucesso);

      assert.strictEqual(sucessos.length, 1, 'Apenas uma das compras concorrentes pode ter sucesso');
      assert.strictEqual(falhas.length, 1, 'A outra compra deve falhar por falta de saldo');

      const estadoFinal = await ShopStore.carregar(mockApp);
      assert.strictEqual(estadoFinal.saldo >= 0, true, `Saldo final não pode ser negativo: ${estadoFinal.saldo}`);
      if (resA.sucesso) {
        assert.strictEqual(estadoFinal.saldo, 0);
        assert.ok(estadoFinal.desbloqueados.includes('tree-pine'));
        assert.ok(!estadoFinal.desbloqueados.includes('audio-brown-noise'));
      } else {
        assert.strictEqual(estadoFinal.saldo, 20);
        assert.ok(estadoFinal.desbloqueados.includes('audio-brown-noise'));
        assert.ok(!estadoFinal.desbloqueados.includes('tree-pine'));
      }
    });
  });

  // =========================================================================
  // 3. Casos de Borda de Saldo Insuficiente
  // =========================================================================
  describe('3. Casos de Borda de Saldo Insuficiente', () => {
    test('tentativa de compra com saldo = preco - 1 é estritamente rejeitada', async () => {
      // Sakura custa 50. Saldo = 49
      const mockApp = criarMockApp({ saldo: 49, desbloqueados: ['sprout'] });
      const bus = criarMockEventBus();

      const res = await ShopStore.comprarItem(mockApp, 'flower-2', bus);
      assert.strictEqual(res.sucesso, false);
      assert.strictEqual(res.erro, 'INSUFFICIENT_FUNDS');
      assert.ok(res.mensagem.includes('Faltam 1 moedas de foco'));

      // Saldo inalterado
      assert.strictEqual(ShopStore.obterSaldo(mockApp), 49);
      assert.ok(!ShopStore.obterItensDesbloqueados(mockApp).includes('flower-2'));

      // Nenhum evento de compra emitido
      const eventos = bus.getEventos();
      assert.strictEqual(eventos.length, 0);
    });

    test('tentativa de compra com saldo 0 ou negativo é estritamente rejeitada', async () => {
      const mockApp = criarMockApp({ saldo: 0, desbloqueados: ['sprout'] });
      const res = await ShopStore.comprarItem(mockApp, 'tree-pine');
      assert.strictEqual(res.sucesso, false);
      assert.strictEqual(res.erro, 'INSUFFICIENT_FUNDS');
    });

    test('itens de preço 0 são desbloqueados por padrão no catálogo e compra subsequente retorna ALREADY_UNLOCKED', async () => {
      const mockApp = criarMockApp(null);
      // 'sprout' é gratuito (preço 0), mas faz parte do starter kit desbloqueado
      const res = await ShopStore.comprarItem(mockApp, 'sprout');
      assert.strictEqual(res.sucesso, false);
      assert.strictEqual(res.erro, 'ALREADY_UNLOCKED');
      assert.strictEqual(ShopStore.obterSaldo(mockApp), 0);
    });
  });

  // =========================================================================
  // 4. Resiliência a Armazenamento Corrompido
  // =========================================================================
  describe('4. Resiliência a Armazenamento Corrompido', () => {
    test('snoopy-shop.json com JSON malformado/truncado recupera com schema padrão seguro', async () => {
      const malformedJson = '{ "saldo": 100, "desbloqueados": [ "tree-pine", ';
      const mockApp = criarMockApp(malformedJson);

      const estado = await ShopStore.carregar(mockApp);
      assert.strictEqual(estado.versao, 1);
      assert.strictEqual(estado.saldo, 0);
      assert.ok(estado.desbloqueados.includes('sprout'));
      assert.strictEqual(ShopStore.obterSaldo(mockApp), 0);
    });

    test('snoopy-shop.json com chaves nulas ou ausentes não lança TypeError', async () => {
      const mockApp = criarMockApp({
        saldo: null,
        totalGanhosHistoricos: null,
        desbloqueados: null,
        equipados: null,
        estatisticasBotanicas: null,
        historicoTransacoes: null
      });

      const estado = await ShopStore.carregar(mockApp);
      assert.strictEqual(estado.saldo, 0);
      assert.strictEqual(estado.totalGanhosHistoricos, 0);
      assert.ok(Array.isArray(estado.desbloqueados));
      assert.strictEqual(typeof estado.equipados, 'object');
      assert.strictEqual(estado.equipados.botanical, 'sprout');
      assert.strictEqual(estado.equipados.audio, 'audio-white-noise');
      assert.strictEqual(estado.equipados.cosmetic, 'theme-preset-snoopy');
    });

    test('obterItensDesbloqueados() lida defensivamente se desbloqueados contiver elementos anômalos (null, numbers)', async () => {
      const mockApp = criarMockApp({
        saldo: 0,
        desbloqueados: [null, undefined, 12345, 'sprout', 'audio-white-noise', 'theme-preset-snoopy']
      });

      // Não deve lançar TypeError ao filtrar por categoria
      assert.doesNotThrow(() => {
        const botanicos = ShopStore.obterItensDesbloqueados(mockApp, 'botanical');
        assert.ok(botanicos.includes('sprout'));
      }, 'Não deve lançar TypeError com null em desbloqueados');

      assert.doesNotThrow(() => {
        const audios = ShopStore.obterItensDesbloqueados(mockApp, 'audio');
        assert.ok(audios.includes('audio-white-noise'));
      }, 'Não deve lançar TypeError ao filtrar audio com null em desbloqueados');
    });

    test('migração do legado com historicoCompras corrompido (itens nulos ou inválidos)', async () => {
      const mockApp = criarMockApp(null);
      // Arquivo legado com dados imperfeitos
      mockApp.vault._getRawStore().set('99_Meta/jardim-constancia.json', JSON.stringify({
        moedas: '45',
        arvoreAtiva: 'flower-2',
        desbloqueadas: ['sprout', 'flower-2'],
        totalPlantadas: '3',
        historicoCompras: [
          null, // item nulo que causa crash em h.id se não tratado
          { id: 'flower-2', preco: 50, data: '2026-10-31T10:00:00Z' },
          { id: null, preco: 'invalido' }
        ]
      }));

      await assert.doesNotReject(async () => {
        const estado = await ShopStore.carregar(mockApp);
        // O estado não deve ser resetado para padrão se apenas o histórico tiver null
        assert.strictEqual(estado.saldo, 45, 'Saldo migrado deve ser 45 mesmo com histórico corrompido');
        assert.strictEqual(estado.equipados.botanical, 'flower-2');
        assert.ok(estado.desbloqueados.includes('flower-2'));
        assert.ok(Array.isArray(estado.historicoTransacoes));
      });
    });
  });

  // =========================================================================
  // 5. Integridade do Barramento de Eventos (EventBus Contract)
  // =========================================================================
  describe('5. Integridade do Barramento de Eventos', () => {
    test('comprarItem() emite os 3 eventos contratuais com payloads canônicos exatos', async () => {
      const mockApp = criarMockApp({ saldo: 100, desbloqueados: ['sprout'] });
      const bus = criarMockEventBus();

      const res = await ShopStore.comprarItem(mockApp, 'tree-pine', bus);
      assert.strictEqual(res.sucesso, true);

      const eventos = bus.getEventos();
      assert.strictEqual(eventos.length, 3, 'Deve emitir exatamente 3 eventos');

      // 1. shop:item_purchased
      const evItemPurchased = eventos.find(e => e.nome === 'shop:item_purchased');
      assert.ok(evItemPurchased, 'shop:item_purchased deve ser emitido');
      assert.strictEqual(evItemPurchased.payload.item.id, 'tree-pine');
      assert.strictEqual(evItemPurchased.payload.saldoAtual, 0);

      // 2. economy:balance_updated
      const evBalanceUpdated = eventos.find(e => e.nome === 'economy:balance_updated');
      assert.ok(evBalanceUpdated, 'economy:balance_updated deve ser emitido');
      assert.strictEqual(evBalanceUpdated.payload.saldoAtual, 0);
      assert.strictEqual(evBalanceUpdated.payload.delta, -100);
      assert.strictEqual(evBalanceUpdated.payload.motivo, 'compra_item');

      // 3. inventory:item_equipped
      const evItemEquipped = eventos.find(e => e.nome === 'inventory:item_equipped');
      assert.ok(evItemEquipped, 'inventory:item_equipped deve ser emitido');
      assert.strictEqual(evItemEquipped.payload.categoria, 'botanical');
      assert.strictEqual(evItemEquipped.payload.itemId, 'tree-pine');
      assert.strictEqual(evItemEquipped.payload.item.id, 'tree-pine');
    });

    test('equiparItem() emite inventory:item_equipped com payload exato', async () => {
      const mockApp = criarMockApp({
        saldo: 0,
        desbloqueados: ['sprout', 'flower-2', 'audio-white-noise', 'theme-preset-snoopy']
      });
      const bus = criarMockEventBus();

      const res = await ShopStore.equiparItem(mockApp, 'flower-2', bus);
      assert.strictEqual(res.sucesso, true);

      const eventos = bus.getEventos();
      assert.strictEqual(eventos.length, 1);
      assert.strictEqual(eventos[0].nome, 'inventory:item_equipped');
      assert.strictEqual(eventos[0].payload.categoria, 'botanical');
      assert.strictEqual(eventos[0].payload.itemId, 'flower-2');
      assert.strictEqual(eventos[0].payload.item.id, 'flower-2');
    });

    test('ShopStore não quebra se eventBus for nulo, indefinido ou lançar exceção', async () => {
      const mockApp = criarMockApp({ saldo: 200, desbloqueados: ['sprout'] });

      // 1. null eventBus
      const r1 = await ShopStore.creditarMoedas(mockApp, 50, 'sem_bus', null);
      assert.strictEqual(r1, 250);

      // 2. eventBus explosivo
      const explodingBus = criarMockEventBus(true);
      const r2 = await ShopStore.comprarItem(mockApp, 'flower-2', explodingBus);
      assert.strictEqual(r2.sucesso, true, 'Deve concluir a compra com sucesso mesmo se o listener do eventBus falhar');
      assert.strictEqual(ShopStore.obterSaldo(mockApp), 200);
    });
  });
});

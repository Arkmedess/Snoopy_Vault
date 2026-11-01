const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// Helper to create mock Obsidian App
function criarMockApp(dadosIniciais = null) {
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
      if (!fileStore.has(p)) {
        throw new Error(`File not found: ${p}`);
      }
      return fileStore.get(p);
    },
    modify: async (file, content) => {
      const p = typeof file === 'string' ? file : file.path;
      fileStore.set(p, typeof content === 'string' ? content : JSON.stringify(content));
    },
    create: async (filePath, content) => {
      fileStore.set(filePath, typeof content === 'string' ? content : JSON.stringify(content));
      return { path: filePath, name: path.basename(filePath) };
    },
    _getRawStore: () => fileStore
  };

  return { vault };
}

// Simple Mock EventBus
function criarMockEventBus() {
  const eventos = [];
  return {
    emit: (nome, payload) => eventos.push({ nome, payload }),
    getEventos: () => eventos
  };
}

describe('ShopStore - Central de Economia, Catálogo & Inventário', () => {
  let ShopStore;

  test('Módulo exporta ShopStore com contrato público completo', () => {
    ShopStore = require('../../99_Meta/Snoopy/core/shop_store.js');
    assert.strictEqual(typeof ShopStore, 'object');
    assert.strictEqual(typeof ShopStore.obterCatalogo, 'function');
    assert.strictEqual(typeof ShopStore.obterItemPorId, 'function');
    assert.strictEqual(typeof ShopStore.obterEstadoPadrao, 'function');
    assert.strictEqual(typeof ShopStore.carregar, 'function');
    assert.strictEqual(typeof ShopStore.salvar, 'function');
    assert.strictEqual(typeof ShopStore.obterSaldo, 'function');
    assert.strictEqual(typeof ShopStore.creditarMoedas, 'function');
    assert.strictEqual(typeof ShopStore.creditarFoco, 'function');
    assert.strictEqual(typeof ShopStore.comprarItem, 'function');
    assert.strictEqual(typeof ShopStore.equiparItem, 'function');
    assert.strictEqual(typeof ShopStore.obterEquipado, 'function');
    assert.strictEqual(typeof ShopStore.obterItensDesbloqueados, 'function');
  });

  test('obterEstadoPadrao() retorna schema inicial com itens gratuitos desbloqueados', () => {
    const padrao = ShopStore.obterEstadoPadrao();
    assert.strictEqual(padrao.versao, 1);
    assert.strictEqual(padrao.saldo, 0);
    assert.strictEqual(padrao.totalGanhosHistoricos, 0);
    assert.ok(Array.isArray(padrao.desbloqueados));
    assert.ok(padrao.desbloqueados.includes('sprout'));
    assert.ok(padrao.desbloqueados.includes('audio-white-noise'));
    assert.ok(padrao.desbloqueados.includes('theme-preset-snoopy'));
    assert.strictEqual(padrao.equipados.botanical, 'sprout');
    assert.strictEqual(padrao.equipados.audio, 'audio-white-noise');
    assert.strictEqual(padrao.equipados.cosmetic, 'theme-preset-snoopy');
    assert.strictEqual(padrao.estatisticasBotanicas.totalPlantadas, 0);
    assert.deepStrictEqual(padrao.historicoTransacoes, []);
  });

  test('obterCatalogo() retorna itens multi-categoria (botanical, audio, cosmetic)', () => {
    const todos = ShopStore.obterCatalogo();
    assert.strictEqual(todos.length, 16); // 6 botanica + 6 audio + 4 cosmeticos

    const botanicos = ShopStore.obterCatalogo('botanical');
    assert.strictEqual(botanicos.length, 6);
    assert.ok(botanicos.every(i => i.categoria === 'botanical'));

    const audios = ShopStore.obterCatalogo('audio');
    assert.strictEqual(audios.length, 6);
    assert.ok(audios.every(i => i.categoria === 'audio'));

    const cosmeticos = ShopStore.obterCatalogo('cosmetic');
    assert.strictEqual(cosmeticos.length, 4);
    assert.ok(cosmeticos.every(i => i.categoria === 'cosmetic'));
  });

  test('obterItemPorId() localiza item ou retorna null para desconhecido', () => {
    const item = ShopStore.obterItemPorId('tree-pine');
    assert.ok(item);
    assert.strictEqual(item.id, 'tree-pine');
    assert.strictEqual(item.preco, 100);

    const desconhecido = ShopStore.obterItemPorId('inexistente_123');
    assert.strictEqual(desconhecido, null);
  });

  test('carregar() inicializa estado padrão quando arquivos não existem no cofre', async () => {
    const mockApp = criarMockApp(null);
    const estado = await ShopStore.carregar(mockApp);
    assert.strictEqual(estado.saldo, 0);
    assert.ok(estado.desbloqueados.includes('sprout'));
    assert.strictEqual(ShopStore.obterSaldo(mockApp), 0);
  });

  test('carregar() lida defensivamente com JSON corrompido sem travar', async () => {
    const mockApp = criarMockApp('{ MALFORMED_JSON: true');
    const estado = await ShopStore.carregar(mockApp);
    assert.strictEqual(estado.saldo, 0);
    assert.ok(estado.desbloqueados.includes('sprout'));
  });

  test('migração automática: lê dados de jardim-constancia.json quando snoopy-shop.json não existe', async () => {
    const mockApp = criarMockApp(null);
    // Insere apenas o legado
    mockApp.vault._getRawStore().set('99_Meta/jardim-constancia.json', JSON.stringify({
      moedas: 85,
      arvoreAtiva: 'flower-2',
      desbloqueadas: ['sprout', 'flower-2'],
      totalPlantadas: 7,
      historicoCompras: [
        { id: 'flower-2', preco: 50, data: '2026-10-31T10:00:00Z' }
      ]
    }));

    const estado = await ShopStore.carregar(mockApp);
    assert.strictEqual(estado.saldo, 85);
    assert.strictEqual(estado.equipados.botanical, 'flower-2');
    assert.ok(estado.desbloqueados.includes('flower-2'));
    assert.ok(estado.desbloqueados.includes('audio-white-noise'));
    assert.strictEqual(estado.estatisticasBotanicas.totalPlantadas, 7);

    // Confirma que criou/salvou o novo snoopy-shop.json
    assert.ok(mockApp.vault._getRawStore().has('99_Meta/snoopy-shop.json'));
  });

  test('creditarMoedas() incrementa saldo, registra transação e emite evento', async () => {
    const mockApp = criarMockApp(null);
    const bus = criarMockEventBus();

    const novoSaldo = await ShopStore.creditarMoedas(mockApp, 50, 'recompensa_tarefa', bus);
    assert.strictEqual(novoSaldo, 50);
    assert.strictEqual(ShopStore.obterSaldo(mockApp), 50);

    const eventos = bus.getEventos();
    assert.strictEqual(eventos.length, 1);
    assert.strictEqual(eventos[0].nome, 'economy:balance_updated');
    assert.strictEqual(eventos[0].payload.saldoAtual, 50);
    assert.strictEqual(eventos[0].payload.delta, 50);
  });

  test('creditarFoco() calcula base e multiplicadores de combo pomodoro', async () => {
    const mockApp = criarMockApp(null);

    // 25m combo 1: 5 moedas
    const r1 = await ShopStore.creditarFoco(mockApp, 25, 1);
    assert.strictEqual(r1.moedasGanhas, 5);
    assert.strictEqual(r1.saldoAtual, 5);

    // 25m combo 3: 5 base + 1 bonus = 6 moedas (saldo 11)
    const r2 = await ShopStore.creditarFoco(mockApp, 25, 3);
    assert.strictEqual(r2.moedasGanhas, 6);
    assert.strictEqual(r2.bonusCombo, 1);
    assert.strictEqual(r2.saldoAtual, 11);

    // 50m combo 5: 10 base + 2 bonus = 12 moedas (saldo 23)
    const r3 = await ShopStore.creditarFoco(mockApp, 50, 5);
    assert.strictEqual(r3.moedasGanhas, 12);
    assert.strictEqual(r3.bonusCombo, 2);
    assert.strictEqual(r3.saldoAtual, 23);

    // Minutos negativos ou zero garantem mínimo 1 moeda
    const r4 = await ShopStore.creditarFoco(mockApp, 0, 1);
    assert.strictEqual(r4.moedasGanhas, 1);
  });

  test('comprarItem() valida saldo, debita, auto-equipa e emite eventos', async () => {
    const mockApp = criarMockApp({ saldo: 150, desbloqueados: ['sprout', 'audio-white-noise', 'theme-preset-snoopy'] });
    const bus = criarMockEventBus();

    // 1. Tenta comprar item que não existe
    const failInexistente = await ShopStore.comprarItem(mockApp, 'item_fake_999', bus);
    assert.strictEqual(failInexistente.sucesso, false);

    // 2. Tenta comprar item já desbloqueado
    const failJaComprado = await ShopStore.comprarItem(mockApp, 'sprout', bus);
    assert.strictEqual(failJaComprado.sucesso, false);

    // 3. Tenta comprar item com saldo insuficiente (Bonsai = 300)
    const failSaldo = await ShopStore.comprarItem(mockApp, 'library', bus);
    assert.strictEqual(failSaldo.sucesso, false);
    assert.ok(failSaldo.mensagem.includes('Moedas insuficientes'));

    // 4. Compra com saldo adequado (Pinheiro = 100)
    const okCompra = await ShopStore.comprarItem(mockApp, 'tree-pine', bus);
    assert.strictEqual(okCompra.sucesso, true);
    assert.strictEqual(ShopStore.obterSaldo(mockApp), 50);
    assert.ok(ShopStore.obterItensDesbloqueados(mockApp).includes('tree-pine'));
    // Botânico auto-equipa
    assert.strictEqual(okCompra.estado.equipados.botanical, 'tree-pine');

    const eventos = bus.getEventos();
    assert.ok(eventos.some(e => e.nome === 'shop:item_purchased'));
  });

  test('equiparItem() equipa apenas itens desbloqueados na respectiva categoria', async () => {
    const mockApp = criarMockApp({
      saldo: 100,
      desbloqueados: ['sprout', 'flower-2', 'audio-white-noise', 'audio-brown-noise'],
      equipados: { botanical: 'sprout', audio: 'audio-white-noise', cosmetic: 'theme-preset-snoopy' }
    });
    const bus = criarMockEventBus();

    // Tenta equipar item bloqueado
    const fail = await ShopStore.equiparItem(mockApp, 'tree-pine', bus);
    assert.strictEqual(fail.sucesso, false);

    // Equipa botânico desbloqueado
    const okBot = await ShopStore.equiparItem(mockApp, 'flower-2', bus);
    assert.strictEqual(okBot.sucesso, true);
    assert.strictEqual(await ShopStore.obterEquipado(mockApp, 'botanical'), 'flower-2');

    // Equipa áudio desbloqueado
    const okAud = await ShopStore.equiparItem(mockApp, 'audio-brown-noise', bus);
    assert.strictEqual(okAud.sucesso, true);
    assert.strictEqual(await ShopStore.obterEquipado(mockApp, 'audio'), 'audio-brown-noise');
  });

  test('obterItensDesbloqueados() filtra por categoria corretamente', async () => {
    const mockApp = criarMockApp({
      saldo: 0,
      desbloqueados: ['sprout', 'flower-2', 'audio-white-noise', 'theme-preset-snoopy']
    });

    const todos = ShopStore.obterItensDesbloqueados(mockApp);
    assert.strictEqual(todos.length, 4);

    const botanicos = ShopStore.obterItensDesbloqueados(mockApp, 'botanical');
    assert.deepStrictEqual(botanicos, ['sprout', 'flower-2']);

    const audios = ShopStore.obterItensDesbloqueados(mockApp, 'audio');
    assert.deepStrictEqual(audios, ['audio-white-noise']);
  });

  test('creditarFoco() e creditarMoedas() lidam defensivamente com limites numéricos e NaN', async () => {
    const mockApp = criarMockApp(null);

    // NaN em minutos
    const rNan = await ShopStore.creditarFoco(mockApp, NaN, 1);
    assert.ok(Number.isFinite(rNan.moedasGanhas));
    assert.ok(Number.isFinite(rNan.saldoAtual));
    assert.strictEqual(rNan.saldoAtual > 0, true);

    // Quantidade negativa em creditarMoedas não deve diminuir saldo
    const saldoAntes = ShopStore.obterSaldo(mockApp);
    const saldoDepois = await ShopStore.creditarMoedas(mockApp, -50, 'invalido');
    assert.strictEqual(saldoDepois, saldoAntes);
  });

  test('queries com parâmetros inválidos retornam fallbacks seguros', async () => {
    const mockApp = criarMockApp(null);

    assert.deepStrictEqual(ShopStore.obterCatalogo('categoria_inexistente'), []);
    assert.strictEqual(await ShopStore.obterEquipado(mockApp, 'categoria_inexistente'), null);

    const failEquipar = await ShopStore.equiparItem(mockApp, 'item_inexistente_999');
    assert.strictEqual(failEquipar.sucesso, false);
  });

  test('limparCacheMemoria() remove cache em memória com sucesso', async () => {
    const mockApp = criarMockApp({ saldo: 75, desbloqueados: ['sprout'] });
    assert.strictEqual(ShopStore.obterSaldo(mockApp), 75);

    ShopStore.limparCacheMemoria(mockApp);
    // Re-leitura a partir do mock store ainda recupera 75
    assert.strictEqual(ShopStore.obterSaldo(mockApp), 75);

    ShopStore.limparCacheMemoria();
  });
});


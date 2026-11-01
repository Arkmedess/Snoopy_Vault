/**
 * Snoopy Vault - Challenger M4.2 Stress Test Suite
 * Cross-Module Compatibility, Facade Integrity & End-to-End Pipeline
 *
 * Verificação empírica adversarial:
 * 1. Retrocompatibilidade estrita de JardimStore com chamadas legadas de pomodoro_jardim.js e 02_snoopy_cockpit_pomodoro.js.
 * 2. Sincronização bidirecional de dados entre JardimStore e ShopStore (saldo, inventário e itens equipados).
 * 3. Pipeline cross-feature integrado: Sessão de foco -> crédito de moedas -> compra de áudio na loja -> desbloqueio em PomodoroAudio -> síntese Web Audio API.
 * 4. Simulação de Cold Restart (reinício a frio, esvaziamento de cache e recarga do cofre sem perda de estado).
 * 5. Casos de borda adversariais e tolerância a migração/corrupção de arquivos.
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  MockAudioContext,
  createMockLocalStorage,
  criarMockApp
} = require('../e2e/helpers/e2e_utils.js');

const JARDIM_STORE_PATH = path.resolve(__dirname, '../../99_Meta/Snoopy/core/jardim_store.js');
const SHOP_STORE_PATH = path.resolve(__dirname, '../../99_Meta/Snoopy/core/shop_store.js');
const AUDIO_MODULE_PATH = path.resolve(__dirname, '../../99_Meta/Snoopy/core/pomodoro_audio.js');

function carregarModulosLimpos() {
  delete require.cache[require.resolve(SHOP_STORE_PATH)];
  delete require.cache[require.resolve(JARDIM_STORE_PATH)];
  delete require.cache[require.resolve(AUDIO_MODULE_PATH)];

  const ShopStore = require(SHOP_STORE_PATH);
  const JardimStore = require(JARDIM_STORE_PATH);
  const PomodoroAudio = require(AUDIO_MODULE_PATH);

  return { ShopStore, JardimStore, PomodoroAudio };
}

describe('Challenger M4.2 - Cross-Module Compatibility & Facade Stress Suite', () => {
  let ShopStore;
  let JardimStore;
  let PomodoroAudio;
  let mockCtx;
  let mockStorage;

  beforeEach(() => {
    const modules = carregarModulosLimpos();
    ShopStore = modules.ShopStore;
    JardimStore = modules.JardimStore;
    PomodoroAudio = modules.PomodoroAudio;

    mockCtx = new MockAudioContext();
    mockStorage = createMockLocalStorage();
    PomodoroAudio.conectarContexto(mockCtx);
    PomodoroAudio.conectarStorage(mockStorage);
  });

  // =========================================================================
  // 1. Full Backward Compatibility of JardimStore Facade
  // =========================================================================
  describe('1. Retrocompatibilidade Total de JardimStore (Chamadas Legadas)', () => {
    test('obterEstadoPadrao() preserva assinatura legada estrita', () => {
      const padrao = JardimStore.obterEstadoPadrao();
      assert.strictEqual(typeof padrao, 'object');
      assert.strictEqual(padrao.moedas, 0);
      assert.strictEqual(padrao.arvoreAtiva, 'sprout');
      assert.deepStrictEqual(padrao.desbloqueadas, ['sprout']);
      assert.strictEqual(padrao.totalPlantadas, 0);
      assert.deepStrictEqual(padrao.historicoCompras, []);
    });

    test('CATALOGO retorna as 6 espécies botânicas com metadados e categoria legada', () => {
      const catalogo = JardimStore.CATALOGO;
      assert.ok(Array.isArray(catalogo), 'CATALOGO deve ser um array');
      assert.strictEqual(catalogo.length, 6, 'Deve conter exatamente 6 espécies botânicas');

      const ids = catalogo.map(item => item.id);
      assert.deepStrictEqual(ids, ['sprout', 'flower-2', 'tree-pine', 'sparkles', 'library', 'trees']);

      for (const item of catalogo) {
        assert.ok(item.nome, `Item ${item.id} deve ter nome`);
        assert.ok(typeof item.preco === 'number', `Item ${item.id} deve ter preco numérico`);
        assert.ok(item.iconName, `Item ${item.id} deve ter iconName`);
        assert.ok(item.cor, `Item ${item.id} deve ter cor`);
        assert.ok(item.lore, `Item ${item.id} deve ter lore`);
        assert.ok(item.beneficio, `Item ${item.id} deve ter beneficio`);
        // Na assinatura legada de pomodoro_jardim.js, categoria contém o rótulo de subtipo
        assert.ok(item.categoria, `Item ${item.id} deve ter categoria preenchida`);
      }
    });

    test('carregar() em cofre vazio inicializa estado padrão sem quebrar', async () => {
      const app = criarMockApp(null);
      const estado = await JardimStore.carregar(app);
      assert.strictEqual(estado.moedas, 0);
      assert.strictEqual(estado.arvoreAtiva, 'sprout');
      assert.deepStrictEqual(estado.desbloqueadas, ['sprout']);
      assert.strictEqual(estado.totalPlantadas, 0);
      assert.deepStrictEqual(estado.historicoCompras, []);
    });

    test('creditarFoco() atende integralmente ao fluxo de 02_snoopy_cockpit_pomodoro.js', async () => {
      const app = criarMockApp(null);

      // Simulação do término do ciclo pomodoro (25min, combo 1)
      const res1 = await JardimStore.creditarFoco(app, 25, 1);
      assert.strictEqual(res1.moedasGanhas, 5);
      assert.strictEqual(res1.base, 5);
      assert.strictEqual(res1.bonusCombo, 0);
      assert.strictEqual(res1.combo, 1);
      assert.strictEqual(res1.saldoAtual, 5);

      // Simulação de término de ciclo longo com combo 5 (+2 moedas de bônus)
      const res2 = await JardimStore.creditarFoco(app, 50, 5);
      assert.strictEqual(res2.moedasGanhas, 12); // base 10 + bonus 2
      assert.strictEqual(res2.base, 10);
      assert.strictEqual(res2.bonusCombo, 2);
      assert.strictEqual(res2.combo, 5);
      assert.strictEqual(res2.saldoAtual, 17);

      // Simulação de término com combo 10 (+3 moedas de bônus)
      const res3 = await JardimStore.creditarFoco(app, 25, 10);
      assert.strictEqual(res3.moedasGanhas, 8); // base 5 + bonus 3
      assert.strictEqual(res3.bonusCombo, 3);
      assert.strictEqual(res3.saldoAtual, 25);
    });

    test('comprarArvore() e selecionarArvore() reproduzem o comportamento legado exato de pomodoro_jardim.js', async () => {
      const app = criarMockApp({ moedas: 100, desbloqueadas: ['sprout'] });

      // Tentativa de compra com espécie inexistente
      const erroInexistente = await JardimStore.comprarArvore(app, 'arvore-fake-alienigena');
      assert.strictEqual(erroInexistente.sucesso, false);
      assert.ok(erroInexistente.mensagem.includes('não encontrada'));

      // Tentativa de compra de árvore que excede o saldo (Floresta Mágica - 500 moedas)
      const erroSaldo = await JardimStore.comprarArvore(app, 'trees');
      assert.strictEqual(erroSaldo.sucesso, false);
      assert.ok(erroSaldo.mensagem.includes('Moedas insuficientes'));

      // Compra bem sucedida da Cerejeira Sakura (50 moedas)
      const compraOk = await JardimStore.comprarArvore(app, 'flower-2');
      assert.strictEqual(compraOk.sucesso, true);
      assert.ok(compraOk.mensagem.includes('desbloqueado com sucesso'));
      assert.strictEqual(compraOk.estado.moedas, 50);
      assert.ok(compraOk.estado.desbloqueadas.includes('flower-2'));
      assert.strictEqual(compraOk.estado.arvoreAtiva, 'flower-2');

      // Seleção de árvore desbloqueada
      const selecaoOk = await JardimStore.selecionarArvore(app, 'sprout');
      assert.strictEqual(selecaoOk.sucesso, true);
      assert.strictEqual(selecaoOk.estado.arvoreAtiva, 'sprout');

      // Seleção de árvore bloqueada
      const selecaoBloq = await JardimStore.selecionarArvore(app, 'trees');
      assert.strictEqual(selecaoBloq.sucesso, false);
      assert.strictEqual(selecaoBloq.estado.arvoreAtiva, 'sprout');
    });

    test('salvar() legado preserva outros itens desbloqueados (áudio e temas) no ShopStore', async () => {
      const app = criarMockApp(null);

      // Primeiro, insere desbloqueios não-botânicos no ShopStore
      await ShopStore.creditarMoedas(app, 500);
      await ShopStore.comprarItem(app, 'audio-brown-noise');
      await ShopStore.comprarItem(app, 'theme-preset-cyber');

      const estadoShopAntes = await ShopStore.carregar(app);
      assert.ok(estadoShopAntes.desbloqueados.includes('audio-brown-noise'));
      assert.ok(estadoShopAntes.desbloqueados.includes('theme-preset-cyber'));

      // Agora, chama JardimStore.salvar com payload legado
      const estadoLegado = {
        moedas: 300,
        arvoreAtiva: 'flower-2',
        desbloqueadas: ['sprout', 'flower-2'],
        totalPlantadas: 7
      };
      await JardimStore.salvar(app, estadoLegado);

      // Verifica se ShopStore manteve os áudios e temas desbloqueados intactos
      const estadoShopDepois = await ShopStore.carregar(app);
      assert.strictEqual(estadoShopDepois.saldo, 300);
      assert.strictEqual(estadoShopDepois.equipados.botanical, 'flower-2');
      assert.ok(estadoShopDepois.desbloqueados.includes('flower-2'));
      assert.ok(estadoShopDepois.desbloqueados.includes('audio-brown-noise'), 'Áudio desbloqueado não pode sumir');
      assert.ok(estadoShopDepois.desbloqueados.includes('theme-preset-cyber'), 'Tema desbloqueado não pode sumir');
      assert.strictEqual(estadoShopDepois.estatisticasBotanicas.totalPlantadas, 7);
    });
  });

  // =========================================================================
  // 2. Data Synchronization Between JardimStore and ShopStore
  // =========================================================================
  describe('2. Sincronização Bidirecional de Dados (JardimStore <-> ShopStore)', () => {
    test('comprarArvore() em JardimStore reflete IMEDIATAMENTE em ShopStore.obterItensDesbloqueados e obterSaldo', async () => {
      const app = criarMockApp(null);
      await ShopStore.creditarMoedas(app, 200);

      assert.strictEqual(ShopStore.obterSaldo(app), 200);
      assert.strictEqual(JardimStore.obterSaldo(app), 200);

      // Compra Pinheiro Alpino (100 moedas) via JardimStore
      const resCompra = await JardimStore.comprarArvore(app, 'tree-pine');
      assert.strictEqual(resCompra.sucesso, true);

      // Verificação síncrona imediata em ShopStore
      assert.strictEqual(ShopStore.obterSaldo(app), 100, 'Saldo em ShopStore deve ser 100 imediatamente');
      assert.strictEqual(JardimStore.obterSaldo(app), 100, 'Saldo em JardimStore deve ser 100 imediatamente');

      const desbloqueadosShop = ShopStore.obterItensDesbloqueados(app);
      assert.ok(desbloqueadosShop.includes('tree-pine'), 'ShopStore deve conter tree-pine');

      const desbloqueadosBotanicos = ShopStore.obterItensDesbloqueados(app, 'botanical');
      assert.ok(desbloqueadosBotanicos.includes('tree-pine'));

      const equipadoBotanico = await ShopStore.obterEquipado(app, 'botanical');
      assert.strictEqual(equipadoBotanico, 'tree-pine');
    });

    test('comprarItem() em ShopStore reflete IMEDIATAMENTE em JardimStore.carregar()', async () => {
      const app = criarMockApp(null);
      await ShopStore.creditarMoedas(app, 300);

      // Compra Bonsai Filosófico (300 moedas) diretamente via ShopStore
      const resCompra = await ShopStore.comprarItem(app, 'library');
      assert.strictEqual(resCompra.sucesso, true);

      // Carrega estado legado projetado via JardimStore
      const estadoJardim = await JardimStore.carregar(app);
      assert.strictEqual(estadoJardim.moedas, 0);
      assert.ok(estadoJardim.desbloqueadas.includes('library'), 'JardimStore deve incluir library');
      assert.strictEqual(estadoJardim.arvoreAtiva, 'library');
    });

    test('desbloqueio de áudio ou cosmético NÃO polui a lista JardimStore.desbloqueadas', async () => {
      const app = criarMockApp(null);
      await ShopStore.creditarMoedas(app, 500);

      await ShopStore.comprarItem(app, 'audio-pink-noise');
      await ShopStore.comprarItem(app, 'theme-preset-rose');

      const estadoJardim = await JardimStore.carregar(app);
      assert.strictEqual(estadoJardim.desbloqueadas.includes('audio-pink-noise'), false, 'Não deve conter áudio');
      assert.strictEqual(estadoJardim.desbloqueadas.includes('theme-preset-rose'), false, 'Não deve conter tema');
      assert.deepStrictEqual(estadoJardim.desbloqueadas, ['sprout'], 'Apenas itens botânicos devem constar');
    });

    test('sincronização síncrona via vault._getRawStore() e salvamento duplo nos dois caminhos', async () => {
      const app = criarMockApp(null);
      await JardimStore.creditarMoedas(app, 150);

      const storeMap = app.vault._getRawStore();
      assert.ok(storeMap.has('99_Meta/snoopy-shop.json'), 'snoopy-shop.json deve ter sido criado');
      assert.ok(storeMap.has('99_Meta/jardim-constancia.json'), 'jardim-constancia.json legado deve ter sido sincronizado');

      const rawShop = JSON.parse(storeMap.get('99_Meta/snoopy-shop.json'));
      const rawLegado = JSON.parse(storeMap.get('99_Meta/jardim-constancia.json'));

      assert.strictEqual(rawShop.saldo, 150);
      assert.strictEqual(rawLegado.moedas, 150);
    });
  });

  // =========================================================================
  // 3. Cross-Feature Pipeline: Focus -> Coins -> Audio Buy -> Unlock -> Play
  // =========================================================================
  describe('3. Pipeline Cross-Feature: Foco -> Moedas -> Compra de Áudio -> Síntese Web Audio', () => {
    test('Pipeline completo: completar sessões, comprar Ruído Marrom e sintetizar playback no AudioContext', async () => {
      const app = criarMockApp(null);

      // Estado Inicial: Usuário possui apenas white_noise desbloqueado
      const faixasIniciais = await PomodoroAudio.obterFaixasDisponiveis(app);
      const idsIniciais = faixasIniciais.map(f => f.trackId || f.id);
      assert.ok(idsIniciais.includes('white_noise'));
      assert.strictEqual(idsIniciais.includes('brown_noise'), false, 'brown_noise deve estar bloqueado inicialmente');

      // 1. Sessão de Foco: Ciclo de 50 minutos Pomodoro credita moedas
      const focoResult = await JardimStore.creditarFoco(app, 50, 3); // base 10 + combo 1 = 11 moedas
      assert.strictEqual(focoResult.saldoAtual, 11);

      // Mais foco acumulado até atingir 80 moedas necessárias para Ruído Marrom
      await JardimStore.creditarMoedas(app, 69, 'sessao_adicional');
      assert.strictEqual(ShopStore.obterSaldo(app), 80);

      // 2. Compra do Ruído Marrom ('audio-brown-noise' por 80 moedas)
      const resCompra = await ShopStore.comprarItem(app, 'audio-brown-noise');
      assert.strictEqual(resCompra.sucesso, true);
      assert.strictEqual(ShopStore.obterSaldo(app), 0);

      // 3. Consulta de faixas disponíveis no PomodoroAudio
      const faixasAposCompra = await PomodoroAudio.obterFaixasDisponiveis(app);
      const trackIds = faixasAposCompra.map(f => f.trackId);
      const shopIds = faixasAposCompra.map(f => f.id);
      assert.ok(trackIds.includes('brown_noise'), 'brown_noise deve estar desbloqueado após compra');
      assert.ok(shopIds.includes('audio-brown-noise'), 'audio-brown-noise deve constar na lista de faixas');

      // 4. Inicializa o motor de áudio e sintetiza Ruído Marrom no AudioContext mock
      await PomodoroAudio.iniciar();
      assert.strictEqual(mockCtx.state, 'running');

      PomodoroAudio.tocar('audio-brown-noise');
      const estadoAudio = PomodoroAudio.obterEstado();
      assert.strictEqual(estadoAudio.isPlaying, true);
      assert.strictEqual(estadoAudio.currentTrack, 'brown_noise');

      // Verifica se o buffer procedural de ruído marrom foi criado e iniciado
      assert.ok(mockCtx.nodesCreated.length > 0, 'Deve criar nós de áudio');
      const bufferSource = mockCtx.nodesCreated.find(n => n.type === 'bufferSource');
      assert.ok(bufferSource, 'BufferSourceNode deve ter sido instanciado');
      assert.strictEqual(bufferSource.loop, true);
      assert.strictEqual(bufferSource._started, true);

      // Validação das amostras matemáticas do buffer (espectro marrom deve ser contínuo e limitado a [-1, 1])
      const buffer = bufferSource.buffer;
      assert.ok(buffer, 'Buffer de áudio deve existir');
      const data = buffer.getChannelData(0);
      assert.ok(data.length > 0);
      let nonZero = false;
      for (let i = 0; i < data.length; i++) {
        assert.ok(data[i] >= -1.0 && data[i] <= 1.0, `Amostra fora do limite: ${data[i]}`);
        if (data[i] !== 0) nonZero = true;
      }
      assert.ok(nonZero, 'Sinal de áudio sintetizado não pode ser silêncio absoluto');

      // 5. Teste de ciclo de controles
      PomodoroAudio.pausar();
      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, false);

      PomodoroAudio.ajustarVolume(0.8);
      assert.strictEqual(PomodoroAudio.obterEstado().volume, 0.8);

      PomodoroAudio.mutar(true);
      assert.strictEqual(PomodoroAudio.obterEstado().isMuted, true);

      PomodoroAudio.mutar(false);
      assert.strictEqual(PomodoroAudio.obterEstado().isMuted, false);

      PomodoroAudio.destroy();
      assert.strictEqual(mockCtx.state, 'closed');
    });

    test('Pipeline procedural com Chuva Zen (buffer) e Ondas Alfa (osciladores binaurais)', async () => {
      const app = criarMockApp(null);
      await ShopStore.creditarMoedas(app, 400);

      // Compra Chuva Zen (120 moedas) e Ondas Alfa (150 moedas)
      await ShopStore.comprarItem(app, 'audio-procedural-rain');
      await ShopStore.comprarItem(app, 'audio-binaural-alpha');

      const faixas = await PomodoroAudio.obterFaixasDisponiveis(app);
      const trackIds = faixas.map(f => f.trackId);
      assert.ok(trackIds.includes('procedural_rain'));
      assert.ok(trackIds.includes('binaural_alpha'));

      await PomodoroAudio.iniciar();

      // Testa reprodução de chuva procedural
      PomodoroAudio.tocar('procedural_rain');
      assert.strictEqual(PomodoroAudio.obterEstado().currentTrack, 'procedural_rain');

      // Testa reprodução de batimento binaural (osciladores estéreo)
      PomodoroAudio.tocar('binaural_alpha');
      assert.strictEqual(PomodoroAudio.obterEstado().currentTrack, 'binaural_alpha');

      const oscs = mockCtx.nodesCreated.filter(n => n.type === 'sine');
      assert.ok(oscs.length >= 2, 'Deve criar oscilador estéreo esquerdo e direito');
      assert.ok(oscs.some(o => o._started === true));
    });
  });

  // =========================================================================
  // 4. Cold Restart Simulation & Absolute Persistence Fidelity
  // =========================================================================
  describe('4. Simulação de Cold Restart & Integridade de Persistência', () => {
    test('Reinício a frio com limpeza de cache preserva 100% de saldo, compras, equipados e estatísticas', async () => {
      const app = criarMockApp(null);

      // Popula o estado com operações de todas as categorias
      await ShopStore.creditarMoedas(app, 1000);
      await JardimStore.creditarFoco(app, 50, 2); // adiciona moedas e totalPlantadas
      await JardimStore.comprarArvore(app, 'flower-2'); // 50
      await JardimStore.comprarArvore(app, 'tree-pine'); // 100
      await ShopStore.comprarItem(app, 'audio-brown-noise'); // 80
      await ShopStore.comprarItem(app, 'audio-procedural-rain'); // 120
      await ShopStore.comprarItem(app, 'theme-preset-cyber'); // 150
      await JardimStore.selecionarArvore(app, 'tree-pine');
      await ShopStore.equiparItem(app, 'audio-brown-noise');
      await ShopStore.equiparItem(app, 'theme-preset-cyber');

      const saldoEsperado = ShopStore.obterSaldo(app);
      const desbloqueadosEsperados = ShopStore.obterItensDesbloqueados(app);
      const estadoJardimAntes = await JardimStore.carregar(app);

      // =====================================================================
      // COLD RESTART: Limpa caches em memória e re-carrega todos os módulos
      // =====================================================================
      ShopStore.limparCacheMemoria(app);
      ShopStore.limparCacheMemoria(null);

      const modulosRecarregados = carregarModulosLimpos();
      const FreshShopStore = modulosRecarregados.ShopStore;
      const FreshJardimStore = modulosRecarregados.JardimStore;
      const FreshPomodoroAudio = modulosRecarregados.PomodoroAudio;

      // 1. Verifica ShopStore recarregado a partir do disco/vault
      const estadoShopFresco = await FreshShopStore.carregar(app);
      assert.strictEqual(estadoShopFresco.saldo, saldoEsperado, 'Saldo deve ser idêntico após restart');
      assert.deepStrictEqual(
        estadoShopFresco.desbloqueados.sort(),
        desbloqueadosEsperados.sort(),
        'Lista de desbloqueados deve ser idêntica'
      );
      assert.strictEqual(estadoShopFresco.equipados.botanical, 'tree-pine');
      assert.strictEqual(estadoShopFresco.equipados.audio, 'audio-brown-noise');
      assert.strictEqual(estadoShopFresco.equipados.cosmetic, 'theme-preset-cyber');
      assert.strictEqual(estadoShopFresco.estatisticasBotanicas.totalPlantadas, 1);

      // 2. Verifica JardimStore legado recarregado
      const estadoJardimFresco = await FreshJardimStore.carregar(app);
      assert.strictEqual(estadoJardimFresco.moedas, estadoJardimAntes.moedas);
      assert.strictEqual(estadoJardimFresco.arvoreAtiva, 'tree-pine');
      assert.deepStrictEqual(estadoJardimFresco.desbloqueadas.sort(), ['flower-2', 'sprout', 'tree-pine'].sort());
      assert.strictEqual(estadoJardimFresco.totalPlantadas, 1);

      // 3. Verifica PomodoroAudio desbloqueios persistidos
      const faixasFresco = await FreshPomodoroAudio.obterFaixasDisponiveis(app);
      const idsFresco = faixasFresco.map(f => f.trackId || f.id);
      assert.ok(idsFresco.includes('brown_noise'));
      assert.ok(idsFresco.includes('procedural_rain'));
      assert.strictEqual(idsFresco.includes('pink_noise'), false, 'pink_noise não foi comprado');
    });

    test('Migração a frio: cofre possuindo apenas arquivo legado jardim-constancia.json converte perfeitamente', async () => {
      // Simula vault legado de versão anterior
      const fileStore = new Map();
      fileStore.set('99_Meta/jardim-constancia.json', JSON.stringify({
        moedas: 85,
        arvoreAtiva: 'flower-2',
        desbloqueadas: ['sprout', 'flower-2'],
        totalPlantadas: 14,
        historicoCompras: [
          { id: 'flower-2', preco: 50, data: '2026-10-25T10:00:00.000Z' }
        ]
      }));

      const app = {
        vault: {
          getAbstractFileByPath: (p) => fileStore.has(p) ? { path: p, name: path.basename(p) } : null,
          read: async (f) => fileStore.get(typeof f === 'string' ? f : f.path),
          modify: async (f, c) => fileStore.set(typeof f === 'string' ? f : f.path, c),
          create: async (p, c) => { fileStore.set(p, c); return { path: p }; },
          _getRawStore: () => fileStore
        }
      };

      // Executa carregamento a frio
      const estadoShop = await ShopStore.carregar(app);
      assert.strictEqual(estadoShop.saldo, 85);
      assert.strictEqual(estadoShop.equipados.botanical, 'flower-2');
      assert.ok(estadoShop.desbloqueados.includes('flower-2'));
      assert.strictEqual(estadoShop.estatisticasBotanicas.totalPlantadas, 14);

      // Verifica se criou snoopy-shop.json
      assert.ok(fileStore.has('99_Meta/snoopy-shop.json'), 'Deve ter criado arquivo canônico snoopy-shop.json');

      // Verifica se JardimStore projeta corretamente
      const estadoJardim = await JardimStore.carregar(app);
      assert.strictEqual(estadoJardim.moedas, 85);
      assert.strictEqual(estadoJardim.arvoreAtiva, 'flower-2');
      assert.deepStrictEqual(estadoJardim.desbloqueadas.sort(), ['flower-2', 'sprout'].sort());
    });
  });

  // =========================================================================
  // 5. Adversarial Boundary Cases & Extreme Resilience
  // =========================================================================
  describe('5. Casos Limite Adversariais e Resiliência', () => {
    test('Chamadas cruzadas rápidas alternadas entre JardimStore e ShopStore mantêm consistência', async () => {
      const app = criarMockApp(null);

      // Alterna entre creditar em JardimStore e debitar em ShopStore
      for (let i = 0; i < 5; i++) {
        await JardimStore.creditarMoedas(app, 20);
        assert.strictEqual(ShopStore.obterSaldo(app), (i + 1) * 20);
      }
      assert.strictEqual(ShopStore.obterSaldo(app), 100);
      assert.strictEqual(JardimStore.obterSaldo(app), 100);
    });

    test('salvar() com payload corrompido, nulo ou tipos primitivos não lança erro', async () => {
      const app = criarMockApp(null);
      await ShopStore.creditarMoedas(app, 50);

      // Passa valores anômalos para JardimStore.salvar
      await assert.doesNotReject(async () => {
        await JardimStore.salvar(app, null);
        await JardimStore.salvar(app, undefined);
        await JardimStore.salvar(app, "string invalida");
        await JardimStore.salvar(app, 12345);
        await JardimStore.salvar(app, {});
      });

      // Saldo anterior deve ser preservado intacto
      assert.strictEqual(ShopStore.obterSaldo(app), 50);
    });

    test('limparCacheMemoria() suporta instância inexistente ou nula sem lançar exceção', () => {
      assert.doesNotThrow(() => {
        ShopStore.limparCacheMemoria(null);
        ShopStore.limparCacheMemoria(undefined);
        ShopStore.limparCacheMemoria({});
      });
    });

    // =======================================================================
    // Testes de Vulnerabilidades Reveladas pelo Challenger M4.2
    // =======================================================================

    test('comprarArvore() e selecionarArvore() DEVEM rejeitar itens não-botânicos (áudio/cosméticos)', async () => {
      const app = criarMockApp(null);
      await ShopStore.creditarMoedas(app, 300);

      // Tentativa de comprar faixa sonora via fachada de árvores
      const resCompraAudio = await JardimStore.comprarArvore(app, 'audio-brown-noise');
      assert.strictEqual(
        resCompraAudio.sucesso,
        false,
        'comprarArvore() não deve permitir a compra de itens de áudio na fachada botânica'
      );

      // Tentativa de equipar tema cosmético via fachada de árvores
      const resEquiparTema = await JardimStore.selecionarArvore(app, 'theme-preset-cyber');
      assert.strictEqual(
        resEquiparTema.sucesso,
        false,
        'selecionarArvore() não deve permitir equipar temas na fachada botânica'
      );
    });

    test('_formatarEstadoLegado() tolera defensivamente elementos anômalos (null, numbers) em desbloqueados e historico', () => {
      assert.doesNotThrow(() => {
        const estadoCorrompido = {
          saldo: 50,
          desbloqueados: ['sprout', null, 123, undefined],
          historicoTransacoes: [
            null,
            { tipo: 'compra_item', itemId: null, valor: 10 },
            { tipo: 'compra_item', itemId: 123, valor: 20 },
            { tipo: 'compra_item', itemId: 'flower-2', valor: 50 }
          ]
        };
        const legado = JardimStore._formatarEstadoLegado(estadoCorrompido);
        assert.ok(legado.desbloqueadas.includes('sprout'));
      }, 'Não deve lançar TypeError ao formatar dados corrompidos');
    });

    test('compras concorrentes via JardimStore.comprarArvore() não causam lost updates nem ultrapassam saldo', async () => {
      // Mock com delay assíncrono para simular latência de I/O em disco
      const fileStore = new Map();
      fileStore.set('99_Meta/snoopy-shop.json', JSON.stringify({
        versao: 1,
        saldo: 100,
        totalGanhosHistoricos: 100,
        desbloqueados: ['sprout', 'audio-white-noise', 'theme-preset-snoopy'],
        equipados: { botanical: 'sprout', audio: 'audio-white-noise', cosmetic: 'theme-preset-snoopy' },
        estatisticasBotanicas: { totalPlantadas: 0 },
        historicoTransacoes: []
      }));

      const app = {
        vault: {
          getAbstractFileByPath: (p) => fileStore.has(p) ? { path: p, name: path.basename(p) } : null,
          read: async (f) => {
            await new Promise(r => setTimeout(r, 5));
            return fileStore.get(typeof f === 'string' ? f : f.path);
          },
          modify: async (f, c) => {
            await new Promise(r => setTimeout(r, 5));
            fileStore.set(typeof f === 'string' ? f : f.path, c);
          },
          create: async (p, c) => {
            await new Promise(r => setTimeout(r, 5));
            fileStore.set(p, c);
            return { path: p };
          },
          _getRawStore: () => fileStore
        }
      };

      // Usuário tem 100 moedas e tenta comprar Cerejeira (50) e Pinheiro (100) em paralelo
      // Custo combinado: 150 moedas. Uma compra DEVE falhar para evitar saldo negativo ou perda de item.
      const [r1, r2] = await Promise.all([
        JardimStore.comprarArvore(app, 'flower-2'),
        JardimStore.comprarArvore(app, 'tree-pine')
      ]);

      const sucessos = [r1, r2].filter(r => r.sucesso);
      const falhas = [r1, r2].filter(r => !r.sucesso);

      assert.strictEqual(sucessos.length, 1, `Apenas 1 compra concorrente deveria ter sucesso, mas ${sucessos.length} tiveram`);
      assert.strictEqual(falhas.length, 1, 'A outra compra concorrente deveria falhar por saldo insuficiente');

      const estadoFinal = await JardimStore.carregar(app);
      assert.strictEqual(estadoFinal.moedas >= 0, true, 'Saldo não pode ficar negativo');
    });
  });
});

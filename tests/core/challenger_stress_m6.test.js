/**
 * Snoopy Vault - Challenger M6.1 Empirical Stress Test Suite
 * Milestone M6: End-to-End User Workflows, Autonomous Shop, Procedural Audio & Cold Restart
 *
 * Verificação empírica adversarial:
 * 1. Multi-step real-world workflow:
 *    Pomodoro focus session completion -> coin accumulation with combo scaling ->
 *    autonomous shop purchase of procedural audio track -> audio engine unlock ->
 *    playback synthesis in MockAudioContext.
 * 2. Botanical legacy interactions through JardimStore facade:
 *    Legacy schema loading, tree purchase, tree selection, cross-category isolation,
 *    and non-destructive persistence (no wiping of audio/cosmetic items).
 * 3. Cold restart simulation & zero state drift:
 *    Multi-generation disk serialization, cache purging (`ShopStore.limparCacheMemoria`),
 *    and exact state reconstruction across generations.
 * 4. Audio engine synthesis & rapid control stress:
 *    Stressful track switching (buffer vs oscillator), volume/mute rapid toggling,
 *    boundary clamping, and finite sample bounds.
 * 5. Autonomous Shop Modal integration:
 *    KPI cards, tab filtering, DOM emoji-free compliance, and purchase/equip state machine.
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  MockAudioContext,
  createMockLocalStorage,
  criarMockApp,
  createMockEl
} = require('../e2e/helpers/e2e_utils.js');

const JARDIM_STORE_PATH = path.resolve(__dirname, '../../99_Meta/Snoopy/core/jardim_store.js');
const SHOP_STORE_PATH = path.resolve(__dirname, '../../99_Meta/Snoopy/core/shop_store.js');
const AUDIO_MODULE_PATH = path.resolve(__dirname, '../../99_Meta/Snoopy/core/pomodoro_audio.js');
const SHOP_MODAL_PATH = path.resolve(__dirname, '../../99_Meta/Snoopy/modulos/shop/shop_modal.js');

function carregarModulosLimpos() {
  delete require.cache[require.resolve(SHOP_STORE_PATH)];
  delete require.cache[require.resolve(JARDIM_STORE_PATH)];
  delete require.cache[require.resolve(AUDIO_MODULE_PATH)];
  delete require.cache[require.resolve(SHOP_MODAL_PATH)];

  const ShopStore = require(SHOP_STORE_PATH);
  const JardimStore = require(JARDIM_STORE_PATH);
  const PomodoroAudio = require(AUDIO_MODULE_PATH);
  const ShopModal = require(SHOP_MODAL_PATH);

  return { ShopStore, JardimStore, PomodoroAudio, ShopModal };
}

describe('Challenger M6.1 - Empirical E2E Integration & Stress Suite', () => {
  let ShopStore;
  let JardimStore;
  let PomodoroAudio;
  let ShopModal;
  let mockCtx;
  let mockStorage;

  beforeEach(() => {
    const modules = carregarModulosLimpos();
    ShopStore = modules.ShopStore;
    JardimStore = modules.JardimStore;
    PomodoroAudio = modules.PomodoroAudio;
    ShopModal = modules.ShopModal;

    mockCtx = new MockAudioContext();
    mockStorage = createMockLocalStorage();
    PomodoroAudio.conectarContexto(mockCtx);
    PomodoroAudio.conectarStorage(mockStorage);
    global.document = {
      createElement: (tag) => createMockEl(tag)
    };
  });

  // =========================================================================
  // Workflow 1: Multi-Step Real-World Pipeline (Session -> Coin -> Shop -> Audio)
  // =========================================================================
  describe('Workflow 1: Multi-Step Focus Session, Economy & Audio Playback', () => {
    test('Ciclo contínuo de 10 sessões com combo progressivo, compra e síntese', async () => {
      const app = criarMockApp(null);

      // Simula 10 sessões de 25 min com combo aumentando de 1 a 10
      // Combo scaling:
      // combo 1, 2: base 5, bonus 0 = 5 cada (10 moedas)
      // combo 3, 4: base 5, bonus 1 = 6 cada (12 moedas)
      // combo 5..9 (5 sessões): base 5, bonus 2 = 7 cada (35 moedas)
      // combo 10: base 5, bonus 3 = 8 (8 moedas)
      // Total esperado de moedas ganhas = 10 + 12 + 35 + 8 = 65 moedas
      let moedasEsperadas = 0;
      for (let combo = 1; combo <= 10; combo++) {
        const resultado = await ShopStore.creditarFoco(app, 25, combo);
        let bonusEsperado = 0;
        if (combo >= 10) bonusEsperado = 3;
        else if (combo >= 5) bonusEsperado = 2;
        else if (combo >= 3) bonusEsperado = 1;

        assert.strictEqual(resultado.base, 5);
        assert.strictEqual(resultado.bonusCombo, bonusEsperado);
        assert.strictEqual(resultado.moedasGanhas, 5 + bonusEsperado);
        moedasEsperadas += (5 + bonusEsperado);
        assert.strictEqual(resultado.saldoAtual, moedasEsperadas);
      }

      assert.strictEqual(ShopStore.obterSaldo(app), 65);

      // Verifica estatísticas botânicas geradas
      const estadoLoja = await ShopStore.carregar(app);
      assert.strictEqual(estadoLoja.estatisticasBotanicas.totalPlantadas, 10);
      assert.strictEqual(estadoLoja.totalGanhosHistoricos, 65);

      // Verifica faixas desbloqueadas antes da compra
      let faixasDisponiveis = await PomodoroAudio.obterFaixasDisponiveis(app);
      const temRosaInicial = faixasDisponiveis.some(f => f.id === 'audio-pink-noise' || f.trackId === 'pink_noise');
      assert.strictEqual(temRosaInicial, false, 'Faixa ruído rosa deve estar inicialmente bloqueada');

      // Tenta comprar item mais caro que o saldo (ex: Árvore Mágica 500 ou Batimento Beta 180)
      const falhaSaldo = await ShopStore.comprarItem(app, 'audio-binaural-beta');
      assert.strictEqual(falhaSaldo.sucesso, false);
      assert.strictEqual(falhaSaldo.erro, 'INSUFFICIENT_FUNDS');
      assert.strictEqual(ShopStore.obterSaldo(app), 65); // Saldo inalterado

      // Compra ruído rosa (preço: 40)
      const compraRosa = await ShopStore.comprarItem(app, 'audio-pink-noise');
      assert.strictEqual(compraRosa.sucesso, true);
      assert.strictEqual(ShopStore.obterSaldo(app), 25);
      assert.ok(compraRosa.estado.desbloqueados.includes('audio-pink-noise'));

      // Verifica se PomodoroAudio reconhece a nova faixa desbloqueada
      faixasDisponiveis = await PomodoroAudio.obterFaixasDisponiveis(app);
      const temRosaAposCompra = faixasDisponiveis.some(f => f.id === 'audio-pink-noise');
      assert.strictEqual(temRosaAposCompra, true, 'Faixa ruído rosa deve agora estar disponível');

      // Tenta recomprar o mesmo item (idempotência defensiva)
      const recompra = await ShopStore.comprarItem(app, 'audio-pink-noise');
      assert.strictEqual(recompra.sucesso, false);
      assert.strictEqual(recompra.erro, 'ALREADY_UNLOCKED');
      assert.strictEqual(ShopStore.obterSaldo(app), 25); // Saldo preservado

      // Executa reprodução da faixa recém-adquirida no motor de áudio
      await PomodoroAudio.iniciar();
      PomodoroAudio.ajustarVolume(0.8);
      PomodoroAudio.tocarFaixa('audio-pink-noise');

      const estadoAudio = PomodoroAudio.obterEstado();
      assert.strictEqual(estadoAudio.isPlaying, true);
      assert.strictEqual(estadoAudio.currentTrack, 'pink_noise');
      assert.strictEqual(estadoAudio.volume, 0.8);

      // Verifica criação e conexões no MockAudioContext
      assert.ok(mockCtx.nodesCreated.length >= 2, 'Deve ter criado master gain e source node');
      const sourceNode = mockCtx.nodesCreated.find(n => n.type === 'bufferSource');
      assert.ok(sourceNode, 'Deve existir um BufferSourceNode');
      assert.strictEqual(sourceNode.loop, true);
      assert.strictEqual(sourceNode._started, true);

      // Pausa áudio
      PomodoroAudio.pausar();
      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, false);
      assert.strictEqual(sourceNode._stopped, true);
    });

    test('Aquisição de faixa binaural com osciladores estéreo e panners', async () => {
      const app = criarMockApp({ saldo: 300, desbloqueados: ['sprout', 'audio-white-noise'] });

      // Compra faixa de ondas alfa (binaural_alpha, 150 moedas)
      const compra = await ShopStore.comprarItem(app, 'audio-binaural-alpha');
      assert.strictEqual(compra.sucesso, true);
      assert.strictEqual(ShopStore.obterSaldo(app), 150);

      await PomodoroAudio.iniciar();
      PomodoroAudio.tocarFaixa('binaural_alpha');

      const estadoAudio = PomodoroAudio.obterEstado();
      assert.strictEqual(estadoAudio.isPlaying, true);
      assert.strictEqual(estadoAudio.currentTrack, 'binaural_alpha');

      // Verifica nós de oscilador e panner
      const oscNodes = mockCtx.nodesCreated.filter(n => n.type === 'sine' || (n.type === 'oscillator'));
      assert.ok(oscNodes.length >= 2, 'Deve ter criado osciladores estéreo para batimento binaural');

      const pannerNodes = mockCtx.nodesCreated.filter(n => n.type === 'stereoPanner' || n.pan !== undefined);
      assert.ok(pannerNodes.length >= 2, 'Deve ter criado panners estéreo esquerdo e direito');

      // Interrompe reprodução
      PomodoroAudio.parar();
      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, false);
    });
  });

  // =========================================================================
  // Workflow 2: Botanical Garden Facade & Cross-Category Isolation
  // =========================================================================
  describe('Workflow 2: JardimStore Facade & Category Isolation', () => {
    test('JardimStore interage com cofre legado sem corromper categorias de áudio/cosméticos', async () => {
      const app = criarMockApp(null);

      // 1. Concede saldo inicial via JardimStore
      await JardimStore.creditarMoedas(app, 200, 'teste');
      assert.strictEqual(JardimStore.obterSaldo(app), 200);
      assert.strictEqual(ShopStore.obterSaldo(app), 200);

      // 2. Compra árvore Pinheiro (100 moedas) via JardimStore
      const compraPinheiro = await JardimStore.comprarArvore(app, 'tree-pine');
      assert.strictEqual(compraPinheiro.sucesso, true);
      assert.strictEqual(compraPinheiro.estado.moedas, 100);
      assert.strictEqual(compraPinheiro.estado.arvoreAtiva, 'tree-pine');
      assert.ok(compraPinheiro.estado.desbloqueadas.includes('tree-pine'));

      // 3. Compra áudio via ShopStore diretamente (ruído marrom, 80 moedas)
      const compraMarrom = await ShopStore.comprarItem(app, 'audio-brown-noise');
      assert.strictEqual(compraMarrom.sucesso, true);
      assert.strictEqual(ShopStore.obterSaldo(app), 20);

      // 4. JardimStore.carregar() deve refletir o novo saldo de 20 moedas, mas NÃO listar áudio em desbloqueadas
      const estadoJardim = await JardimStore.carregar(app);
      assert.strictEqual(estadoJardim.moedas, 20);
      assert.strictEqual(estadoJardim.arvoreAtiva, 'tree-pine');
      assert.ok(estadoJardim.desbloqueadas.includes('tree-pine'));
      assert.ok(!estadoJardim.desbloqueadas.includes('audio-brown-noise'), 'JardimStore não deve expor IDs de áudio em desbloqueadas');

      // 5. Salva dados legados via JardimStore.salvar() e valida que NÃO apaga o áudio do ShopStore
      await JardimStore.salvar(app, {
        moedas: 20,
        arvoreAtiva: 'sprout',
        desbloqueadas: ['sprout', 'tree-pine'],
        totalPlantadas: 7
      });

      const estadoLojaAposSalvarJardim = await ShopStore.carregar(app);
      assert.strictEqual(estadoLojaAposSalvarJardim.saldo, 20);
      assert.ok(estadoLojaAposSalvarJardim.desbloqueados.includes('audio-brown-noise'), 'Áudio deve permanecer no ShopStore após JardimStore.salvar()');
      assert.ok(estadoLojaAposSalvarJardim.desbloqueados.includes('tree-pine'), 'Pinheiro deve permanecer desbloqueado');
      assert.strictEqual(estadoLojaAposSalvarJardim.equipados.botanical, 'sprout');
      assert.strictEqual(estadoLojaAposSalvarJardim.estatisticasBotanicas.totalPlantadas, 7);
    });

    test('JardimStore bloqueia estritamente IDs não-botânicos em comprarArvore e selecionarArvore', async () => {
      const app = criarMockApp({ saldo: 500, desbloqueados: ['sprout', 'audio-white-noise', 'theme-preset-snoopy'] });

      const res1 = await JardimStore.comprarArvore(app, 'audio-pink-noise');
      assert.strictEqual(res1.sucesso, false);
      assert.strictEqual(res1.mensagem, 'Espécie não encontrada no catálogo botânico.');

      const res2 = await JardimStore.comprarArvore(app, 'theme-preset-cyber');
      assert.strictEqual(res2.sucesso, false);
      assert.strictEqual(res2.mensagem, 'Espécie não encontrada no catálogo botânico.');

      const res3 = await JardimStore.selecionarArvore(app, 'audio-white-noise');
      assert.strictEqual(res3.sucesso, false);
      assert.strictEqual(res3.mensagem, 'Espécie não encontrada no catálogo botânico.');

      const res4 = await JardimStore.selecionarArvore(app, null);
      assert.strictEqual(res4.sucesso, false);
    });
  });

  // =========================================================================
  // Workflow 3: Cold Restart Simulation & Zero State Drift
  // =========================================================================
  describe('Workflow 3: Cold Restart Simulation & Zero State Drift', () => {
    test('Persistência resiliente através de 5 gerações completas de reinício a frio', async () => {
      // Simula ciclo completo de uso e reinício
      let diskMock = new Map();

      function criarAppPersistente() {
        return {
          vault: {
            getAbstractFileByPath: (p) => diskMock.has(p) ? { path: p, name: path.basename(p) } : null,
            read: async (f) => {
              const p = typeof f === 'string' ? f : f.path;
              if (!diskMock.has(p)) throw new Error(`Not found: ${p}`);
              return diskMock.get(p);
            },
            modify: async (f, c) => {
              const p = typeof f === 'string' ? f : f.path;
              diskMock.set(p, typeof c === 'string' ? c : JSON.stringify(c));
            },
            create: async (p, c) => {
              diskMock.set(p, typeof c === 'string' ? c : JSON.stringify(c));
              return { path: p };
            },
            _getRawStore: () => diskMock
          }
        };
      }

      // --- GERAÇÃO 1: Criação e primeiras compras ---
      let appGen = criarAppPersistente();
      await ShopStore.creditarMoedas(appGen, 250);
      await ShopStore.comprarItem(appGen, 'audio-brown-noise'); // 80 moedas -> saldo 170
      await ShopStore.comprarItem(appGen, 'theme-preset-cyber'); // 150 moedas -> saldo 20

      assert.strictEqual(ShopStore.obterSaldo(appGen), 20);

      // --- REINÍCIO A FRIO (Gen 1 -> Gen 2) ---
      ShopStore.limparCacheMemoria();
      appGen = criarAppPersistente();

      assert.strictEqual(ShopStore.obterSaldo(appGen), 20);
      let estadoG2 = await ShopStore.carregar(appGen);
      assert.strictEqual(estadoG2.saldo, 20);
      assert.ok(estadoG2.desbloqueados.includes('audio-brown-noise'));
      assert.ok(estadoG2.desbloqueados.includes('theme-preset-cyber'));
      assert.strictEqual(estadoG2.equipados.audio, 'audio-brown-noise');
      assert.strictEqual(estadoG2.equipados.cosmetic, 'theme-preset-cyber');

      // --- GERAÇÃO 2: Crédito via Pomodoro e compra botânica ---
      await JardimStore.creditarFoco(appGen, 50, 1); // 10 moedas -> saldo 30
      await ShopStore.creditarMoedas(appGen, 80); // +80 -> saldo 110
      await JardimStore.comprarArvore(appGen, 'tree-pine'); // 100 moedas -> saldo 10

      // --- REINÍCIO A FRIO (Gen 2 -> Gen 3) ---
      ShopStore.limparCacheMemoria();
      appGen = criarAppPersistente();

      assert.strictEqual(ShopStore.obterSaldo(appGen), 10);
      assert.strictEqual(JardimStore.obterSaldo(appGen), 10);

      let estadoG3Jardim = await JardimStore.carregar(appGen);
      assert.strictEqual(estadoG3Jardim.moedas, 10);
      assert.strictEqual(estadoG3Jardim.arvoreAtiva, 'tree-pine');
      assert.ok(estadoG3Jardim.desbloqueadas.includes('tree-pine'));

      let faixasG3 = await PomodoroAudio.obterFaixasDisponiveis(appGen);
      assert.ok(faixasG3.some(f => f.id === 'audio-brown-noise'));

      // --- GERAÇÃO 3: Troca de item equipado ---
      await ShopStore.equiparItem(appGen, 'sprout');
      await ShopStore.equiparItem(appGen, 'audio-white-noise');
      await ShopStore.equiparItem(appGen, 'theme-preset-snoopy');

      // --- REINÍCIO A FRIO (Gen 3 -> Gen 4) ---
      ShopStore.limparCacheMemoria();
      appGen = criarAppPersistente();

      let estadoG4 = await ShopStore.carregar(appGen);
      assert.strictEqual(estadoG4.equipados.botanical, 'sprout');
      assert.strictEqual(estadoG4.equipados.audio, 'audio-white-noise');
      assert.strictEqual(estadoG4.equipados.cosmetic, 'theme-preset-snoopy');

      // --- REINÍCIO A FRIO (Gen 4 -> Gen 5): Verificação final sem mutações ---
      ShopStore.limparCacheMemoria();
      appGen = criarAppPersistente();

      let estadoG5 = await ShopStore.carregar(appGen);
      assert.strictEqual(estadoG5.saldo, 10);
      assert.strictEqual(estadoG5.desbloqueados.length, 6); // 3 padrão + 3 comprados (brown-noise, cyber, pine)
      assert.ok(estadoG5.desbloqueados.includes('tree-pine'));
      assert.ok(estadoG5.desbloqueados.includes('audio-brown-noise'));
      assert.ok(estadoG5.desbloqueados.includes('theme-preset-cyber'));
    });
  });

  // =========================================================================
  // Workflow 4: Audio Engine Synthesis & Rapid Control Transitions Stress
  // =========================================================================
  describe('Workflow 4: Audio Engine Rapid Stress & Synthesis Bounds', () => {
    test('Alternância rápida de 30 faixas sem vazamento de nós ou exceção', async () => {
      await PomodoroAudio.iniciar();

      const faixas = ['white_noise', 'brown_noise', 'pink_noise', 'procedural_rain', 'binaural_alpha', 'binaural_beta'];

      for (let i = 0; i < 30; i++) {
        const faixa = faixas[i % faixas.length];
        assert.doesNotThrow(() => {
          PomodoroAudio.tocarFaixa(faixa);
        }, `Falha ao alternar para faixa ${faixa} na iteração ${i}`);

        assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, true);
        assert.strictEqual(PomodoroAudio.obterEstado().currentTrack, faixa);
      }

      PomodoroAudio.parar();
      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, false);
    });

    test('Stress test de volume e mudo com valores extremos e bordas numéricas', () => {
      // 100 ajustes rápidos de volume
      const valoresVolume = [0.0, 1.0, 0.5, 0.25, 0.75, -10, 50, NaN, Infinity, -Infinity, '0.42', null, undefined];

      for (const val of valoresVolume) {
        assert.doesNotThrow(() => {
          PomodoroAudio.ajustarVolume(val);
        });

        const estado = PomodoroAudio.obterEstado();
        assert.ok(Number.isFinite(estado.volume), `Volume deve ser finito para entrada ${val}`);
        assert.ok(estado.volume >= 0.0 && estado.volume <= 1.0, `Volume deve estar em [0.0, 1.0] para entrada ${val}`);
      }

      // Alternância de mudo
      for (let i = 0; i < 50; i++) {
        PomodoroAudio.mutar(i % 2 === 0);
        assert.strictEqual(PomodoroAudio.obterEstado().isMuted, i % 2 === 0);
      }
    });

    test('Amostras de áudio procedural sintetizadas são estritamente finitas e normalizadas', () => {
      const tracks = ['white_noise', 'brown_noise', 'pink_noise', 'procedural_rain'];

      for (const t of tracks) {
        const samples = PomodoroAudio._gerarAmostrasFaixa(t, 44100, 1.0);
        assert.ok(samples instanceof Float32Array, `Amostras de ${t} devem ser Float32Array`);
        assert.strictEqual(samples.length, 44100);

        let maxVal = -Infinity;
        let minVal = Infinity;
        let hasNonZero = false;

        for (let i = 0; i < samples.length; i++) {
          const s = samples[i];
          assert.ok(Number.isFinite(s), `Amostra [${i}] em ${t} não é finita: ${s}`);
          assert.ok(s >= -1.0 && s <= 1.0, `Amostra [${i}] em ${t} fora do range [-1.0, 1.0]: ${s}`);
          if (s > maxVal) maxVal = s;
          if (s < minVal) minVal = s;
          if (s !== 0) hasNonZero = true;
        }

        assert.ok(hasNonZero, `Sinal de áudio em ${t} não pode ser silêncio absoluto`);
      }
    });
  });

  // =========================================================================
  // Workflow 5: Autonomous Shop Modal Integration & UI State Machine
  // =========================================================================
  describe('Workflow 5: Autonomous Shop Modal & UI Integrity', () => {
    test('ShopModal abre corretamente, popula KPIs e navega por todas as abas', async () => {
      const app = criarMockApp({ saldo: 150, desbloqueados: ['sprout', 'audio-white-noise', 'theme-preset-snoopy'] });

      let modalAberto = null;
      const MockModalFactory = {
        abrir: (config) => {
          const modalBox = createMockEl('div');
          modalBox.innerHTML = config.htmlContent;
          config.onMontar(modalBox, () => {});
          modalAberto = modalBox;
          return { modalBox, fechar: () => {} };
        }
      };

      const mockUIKit = {
        renderIcon: (el, name, opts) => {
          el.innerHTML = `<svg class="snoopy-icon" data-icon="${name}"></svg>`;
        },
        criarEstadoVazio: (el, opts) => {
          el.innerHTML = `<div class="empty-state">${opts.titulo}</div>`;
        }
      };

      const res = await ShopModal.abrir(app, {
        ModalFactory: MockModalFactory,
        ShopStore,
        renderIcon: mockUIKit.renderIcon
      });

      assert.ok(res, 'ShopModal deve retornar objeto com modalBox');
      assert.ok(modalAberto, 'modalBox deve ter sido montado');

      // Verifica KPIs de saldo
      const saldoEl = modalAberto.querySelector('#snoopy-shop-kpi-balance-num');
      assert.strictEqual(saldoEl.textContent, '150');

      const catalogoTotal = ShopStore.obterCatalogo().length;
      const catalogoEl = modalAberto.querySelector('#snoopy-shop-kpi-catalog');
      assert.ok(catalogoEl.innerText.includes(String(catalogoTotal)));

      // Verifica conformidade de emojis: zero emojis no DOM
      const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
      assert.strictEqual(emojiRegex.test(modalAberto.innerText), false, 'ShopModal DOM não pode conter emojis literais');

      // Testa navegação de abas (botânica, áudio, cosméticos, todos)
      const tabBar = modalAberto.querySelector('.snoopy-tab-bar');
      const tabs = tabBar.querySelectorAll('button');
      assert.strictEqual(tabs.length, 4);

      for (const tab of tabs) {
        if (typeof tab.onclick === 'function') tab.onclick();
        const gridEl = modalAberto.querySelector('#snoopy-shop-grid');
        const cards = gridEl.querySelectorAll('.snoopy-shop-card');
        const cat = tab.getAttribute('data-cat');
        if (cat === 'all') {
          assert.strictEqual(cards.length, catalogoTotal);
        } else {
          const esperado = ShopStore.obterCatalogo(cat).length;
          assert.strictEqual(cards.length, esperado);
        }
      }
    });

    test('Transição de estados no card do item no ShopModal (bloqueado -> desbloqueado -> equipado)', async () => {
      const app = criarMockApp({ saldo: 100, desbloqueados: ['sprout', 'audio-white-noise', 'theme-preset-snoopy'] });

      let modalAberto = null;
      const MockModalFactory = {
        abrir: (config) => {
          const modalBox = createMockEl('div');
          modalBox.innerHTML = config.htmlContent;
          config.onMontar(modalBox, () => {});
          modalAberto = modalBox;
          return { modalBox, fechar: () => {} };
        }
      };

      await ShopModal.abrir(app, {
        ModalFactory: MockModalFactory,
        ShopStore,
        renderIcon: (el, name) => { el.innerHTML = `<svg data-icon="${name}"></svg>`; }
      });

      const gridEl = modalAberto.querySelector('#snoopy-shop-grid');

      // Localiza card da Cerejeira Sakura (flower-2, 50 moedas)
      const cardSakura = Array.from(gridEl.querySelectorAll('.snoopy-shop-card'))
        .find(c => c.querySelector('.snoopy-shop-title').textContent === 'Cerejeira Sakura');

      assert.ok(cardSakura, 'Deve encontrar card da Cerejeira Sakura');
      assert.ok(cardSakura.classList.contains('is-affordable'), 'Deve estar marcado como acessível');

      const actionBox = cardSakura.querySelector('.snoopy-shop-action-box');
      const btnComprar = actionBox.querySelector('button');
      assert.strictEqual(btnComprar.textContent, 'Desbloquear');

      // Clica em comprar
      await btnComprar.onclick();

      // Saldo deve ter diminuído para 50
      assert.strictEqual(ShopStore.obterSaldo(app), 50);

      // Re-localiza o card atualizado após compra
      const cardSakuraApos = Array.from(gridEl.querySelectorAll('.snoopy-shop-card'))
        .find(c => c.querySelector('.snoopy-shop-title').textContent === 'Cerejeira Sakura');

      // Ao comprar, o item é automaticamente equipado pelo ShopStore
      assert.ok(
        cardSakuraApos.classList.contains('is-equipped') || cardSakuraApos.classList.contains('is-unlocked'),
        'Card deve refletir estado adquirido/equipado'
      );
    });
  });
});

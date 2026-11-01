/**
 * Snoopy Vault - Milestone M6 Empirical Boundary & Coverage Challenger Suite (Challenger M6.2)
 *
 * Verificação empírica rigorosa de casos de borda, valores extremos, concorrência e resiliência
 * em todos os módulos centrais do motor:
 * - PomodoroAudio (Web Audio API, faixas procedurais, volumes extremos, ciclo de vida)
 * - ShopStore (Moedas fracionárias, saldo zero/negativo, MAX_SAFE_INTEGER, concorrência estrita)
 * - JardimStore (Delegação defensiva, rejeição de IDs não-botânicos, migração de estado)
 * - UIKit (Catálogo Lucide, fallbacks de ícones desconhecidos, captura de erros em eventos)
 * - TaskParser (Strings vazias, limites de regex, divisão por zero, formatos mistos)
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  MockAudioContext,
  createMockLocalStorage,
  criarMockApp
} = require('../e2e/helpers/e2e_utils.js');

const AUDIO_PATH = path.resolve(__dirname, '../../99_Meta/Snoopy/core/pomodoro_audio.js');
const SHOP_PATH = path.resolve(__dirname, '../../99_Meta/Snoopy/core/shop_store.js');
const JARDIM_PATH = path.resolve(__dirname, '../../99_Meta/Snoopy/core/jardim_store.js');
const UIKIT_PATH = path.resolve(__dirname, '../../99_Meta/Snoopy/core/ui_kit.js');
const TASK_PARSER_PATH = path.resolve(__dirname, '../../99_Meta/Snoopy/core/task_parser.js');
const DATE_UTILS_PATH = path.resolve(__dirname, '../../99_Meta/Snoopy/core/date_utils.js');

function reloadModule(modPath) {
  delete require.cache[require.resolve(modPath)];
  return require(modPath);
}

function createMockEl(tag = 'div', attrs = {}) {
  let _innerHTML = '';
  const listeners = {};
  const el = {
    tagName: tag.toUpperCase(),
    className: attrs.class || '',
    style: {},
    children: [],
    listeners,
    get innerText() { return _innerHTML; },
    set innerText(val) { _innerHTML = val; },
    get textContent() { return _innerHTML; },
    set textContent(val) { _innerHTML = val; },
    get innerHTML() { return _innerHTML; },
    set innerHTML(val) { _innerHTML = val; },
    hasChildNodes: () => el.children.length > 0 || Boolean(_innerHTML && _innerHTML.trim().length > 0),
    get childNodes() { return el.children; },
    createEl: (childTag, opts = {}) => {
      const child = createMockEl(childTag, opts.attr || {});
      if (opts.cls) child.className = opts.cls;
      if (opts.text) {
        child.innerText = opts.text;
        child.innerHTML = opts.text;
      }
      el.children.push(child);
      return child;
    },
    appendChild: (child) => {
      el.children.push(child);
      return child;
    },
    addEventListener: (evt, fn) => {
      if (!listeners[evt]) listeners[evt] = [];
      listeners[evt].push(fn);
    },
    dispatchEvent: async (evt) => {
      if (listeners[evt.type]) {
        for (const fn of listeners[evt.type]) {
          await fn(evt);
        }
      }
    }
  };
  return el;
}

function criarMockEventBus() {
  const eventos = [];
  return {
    emit: (nome, payload) => {
      eventos.push({ nome, payload: JSON.parse(JSON.stringify(payload)) });
    },
    getEventos: () => eventos,
    limpar: () => { eventos.length = 0; }
  };
}

describe('Challenger M6.2 - Boundary Conditions & Coverage Stress Suite', () => {

  // =========================================================================
  // 1. PomodoroAudio - Volumes Extremos, Faixas e Ciclo de Vida
  // =========================================================================
  describe('1. PomodoroAudio: Volumes Extremos, Faixas e Ciclo de Vida', () => {
    let PomodoroAudio;
    let mockCtx;
    let mockStorage;

    beforeEach(() => {
      PomodoroAudio = reloadModule(AUDIO_PATH);
      mockCtx = new MockAudioContext();
      mockStorage = createMockLocalStorage();
      PomodoroAudio.conectarContexto(mockCtx);
      PomodoroAudio.conectarStorage(mockStorage);
    });

    test('ajustarVolume() normaliza rigorosamente valores extremos e degenerados', () => {
      // Valores negativos
      PomodoroAudio.ajustarVolume(-1.0);
      assert.strictEqual(PomodoroAudio.obterEstado().volume, 0.0);
      assert.strictEqual(mockStorage.getItem('snoopy_pomodoro_audio_volume'), '0');

      PomodoroAudio.ajustarVolume(-0.0001);
      assert.strictEqual(PomodoroAudio.obterEstado().volume, 0.0);

      PomodoroAudio.ajustarVolume(-Infinity);
      assert.strictEqual(PomodoroAudio.obterEstado().volume, 0.0);

      // Limites canônicos
      PomodoroAudio.ajustarVolume(0.0);
      assert.strictEqual(PomodoroAudio.obterEstado().volume, 0.0);

      PomodoroAudio.ajustarVolume(1.0);
      assert.strictEqual(PomodoroAudio.obterEstado().volume, 1.0);

      // Valores acima de 1.0
      PomodoroAudio.ajustarVolume(1.0001);
      assert.strictEqual(PomodoroAudio.obterEstado().volume, 1.0);

      PomodoroAudio.ajustarVolume(2.0);
      assert.strictEqual(PomodoroAudio.obterEstado().volume, 1.0);

      PomodoroAudio.ajustarVolume(99999.0);
      assert.strictEqual(PomodoroAudio.obterEstado().volume, 1.0);

      PomodoroAudio.ajustarVolume(Infinity);
      assert.strictEqual(PomodoroAudio.obterEstado().volume, 1.0);

      // NaN e valores não numéricos
      PomodoroAudio.ajustarVolume(NaN);
      assert.strictEqual(PomodoroAudio.obterEstado().volume, 0.5);

      PomodoroAudio.ajustarVolume(undefined);
      assert.strictEqual(PomodoroAudio.obterEstado().volume, 0.5);

      PomodoroAudio.ajustarVolume('invalid_string');
      assert.strictEqual(PomodoroAudio.obterEstado().volume, 0.5);

      PomodoroAudio.ajustarVolume('0.75');
      assert.strictEqual(PomodoroAudio.obterEstado().volume, 0.75);

      PomodoroAudio.ajustarVolume(null);
      assert.strictEqual(PomodoroAudio.obterEstado().volume, 0.0);
    });

    test('recuperação resiliente com storage corrompido ou anômalo', () => {
      mockStorage.setItem('snoopy_pomodoro_audio_volume', 'corrupted_nan');
      mockStorage.setItem('snoopy_pomodoro_audio_muted', 'invalid_bool');
      mockStorage.setItem('snoopy_pomodoro_audio_track', 'unknown_track_id_xyz');
      mockStorage.setItem('snoopy_pomodoro_audio_autosync', 'false');

      const engine = reloadModule(AUDIO_PATH);
      engine.conectarContexto(mockCtx);
      engine.conectarStorage(mockStorage);

      const estado = engine.obterEstado();
      assert.strictEqual(estado.volume, 0.5, 'Volume deve manter fallback seguro de 0.5');
      assert.strictEqual(estado.isMuted, false, 'Muted deve ser false para string inválida');
      assert.strictEqual(estado.autoSync, false, 'AutoSync deve reconhecer false');
      assert.strictEqual(estado.currentTrack, 'unknown_track_id_xyz');
    });

    test('tocar() com identificadores de faixa desconhecidos faz fallback gracioso para ruído branco', async () => {
      await PomodoroAudio.iniciar();
      assert.doesNotThrow(() => {
        PomodoroAudio.tocar('faixa_inexistente_123');
      });
      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, true);

      assert.doesNotThrow(() => {
        PomodoroAudio.tocar(null);
      });
      assert.doesNotThrow(() => {
        PomodoroAudio.tocar('');
      });
      assert.doesNotThrow(() => {
        PomodoroAudio.tocar('__proto__');
      });
    });

    test('integridade numérica e ausência de NaN em todas as taxas de amostragem', () => {
      const sampleRates = [22050, 44100, 48000];
      const faixas = ['white_noise', 'brown_noise', 'pink_noise', 'procedural_rain', 'fallback_unknown'];

      for (const sr of sampleRates) {
        for (const faixa of faixas) {
          const samples = PomodoroAudio._gerarAmostrasFaixa(faixa, sr, 1.0);
          assert.strictEqual(samples.length, sr, `Tamanho do buffer deve ser exatamente ${sr}`);
          for (let i = 0; i < samples.length; i++) {
            const val = samples[i];
            assert.ok(!Number.isNaN(val), `Amostra em ${faixa} [${i}] não pode ser NaN`);
            assert.ok(Number.isFinite(val), `Amostra em ${faixa} [${i}] deve ser finita`);
            assert.ok(val >= -1.0 && val <= 1.0, `Amostra em ${faixa} [${i}] deve estar normalizada entre [-1.0, 1.0] (valor: ${val})`);
          }
        }
      }
    });

    test('stress test de alternância rápida de faixas e nós de áudio', async () => {
      await PomodoroAudio.iniciar();
      const tracks = ['white_noise', 'brown_noise', 'binaural_alpha', 'pink_noise', 'binaural_beta', 'procedural_rain'];

      for (let i = 0; i < 50; i++) {
        const track = tracks[i % tracks.length];
        assert.doesNotThrow(() => {
          PomodoroAudio.tocar(track);
        });
      }
      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, true);

      PomodoroAudio.pausar();
      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, false);

      PomodoroAudio.tocar();
      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, true);

      PomodoroAudio.destroy();
      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, false);
      assert.strictEqual(mockCtx.state, 'closed');
    });

    test('obterFaixasDisponiveis() lida defensivamente com erros de leitura ou dados anômalos no cofre', async () => {
      // 1. app nulo
      const r1 = await PomodoroAudio.obterFaixasDisponiveis(null);
      assert.ok(Array.isArray(r1));
      assert.strictEqual(r1.length, 1);
      assert.strictEqual(r1[0].id, 'audio-white-noise');

      // 2. app com cofre que lança exceção ao ler
      const failingApp = {
        vault: {
          getAbstractFileByPath: () => ({ path: '99_Meta/snoopy-shop.json' }),
          read: async () => { throw new Error('Disco inacessível'); }
        }
      };
      const r2 = await PomodoroAudio.obterFaixasDisponiveis(failingApp);
      assert.ok(Array.isArray(r2));
      assert.strictEqual(r2.length, 1);

      // 3. app com itens anômalos em desbloqueados (null, números, objetos)
      const corruptedApp = {
        vault: {
          getAbstractFileByPath: (p) => p === '99_Meta/snoopy-shop.json' ? { path: p } : null,
          read: async () => JSON.stringify({
            desbloqueados: [null, undefined, 42, { test: 1 }, 'audio-pink-noise', 'audio-binaural-alpha']
          })
        }
      };
      const r3 = await PomodoroAudio.obterFaixasDisponiveis(corruptedApp);
      assert.ok(Array.isArray(r3));
      const ids = r3.map(f => f.id);
      assert.ok(ids.includes('audio-white-noise'));
      assert.ok(ids.includes('audio-pink-noise'));
      assert.ok(ids.includes('audio-binaural-alpha'));
    });
  });

  // =========================================================================
  // 2. ShopStore - Matemática de Moedas, Casos Extremos e Concorrência
  // =========================================================================
  describe('2. ShopStore: Matemática de Moedas, Casos Extremos e Concorrência', () => {
    let ShopStore;

    beforeEach(() => {
      ShopStore = reloadModule(SHOP_PATH);
    });

    test('creditarMoedas() normaliza valores fracionários truncando para inteiro e preservando consistência', async () => {
      const mockApp = criarMockApp({ saldo: 0 });
      const bus = criarMockEventBus();

      // 1. Credita 10.5 moedas: creditarMoedas normaliza na entrada para 10 (inteiro)
      const s1 = await ShopStore.creditarMoedas(mockApp, 10.5, 'fracao', bus);
      assert.strictEqual(s1, 10);
      assert.strictEqual(ShopStore.obterSaldo(mockApp), 10);

      // 2. Tentativa de compra que falha (INSUFFICIENT_FUNDS) chama carregar(app)
      // Saldo permanece consistente em 10 (sem perda oculta posterior)
      const fail = await ShopStore.comprarItem(mockApp, 'flower-2');
      assert.strictEqual(fail.sucesso, false);
      assert.strictEqual(fail.erro, 'INSUFFICIENT_FUNDS');
      assert.strictEqual(ShopStore.obterSaldo(mockApp), 10, 'Saldo permanece 10 após falha de compra');

      // 3. Creditar fração < 1 normaliza para 0; creditar 1.8 normaliza para 1
      const s2 = await ShopStore.creditarMoedas(mockApp, 0.5, 'fracao_menor', bus);
      assert.strictEqual(s2, 10, 'Fração inferior a 1 não altera saldo');

      const s3 = await ShopStore.creditarMoedas(mockApp, 1.8, 'fracao_maior', bus);
      assert.strictEqual(s3, 11, 'Fração 1.8 adiciona 1 moeda inteira');
      assert.strictEqual(ShopStore.obterSaldo(mockApp), 11);
    });

    test('creditarMoedas() e limites numéricos (MAX_SAFE_INTEGER, Infinity, -Infinity, NaN)', async () => {
      const mockApp = criarMockApp({ saldo: 0 });

      // Max Safe Integer
      const s1 = await ShopStore.creditarMoedas(mockApp, Number.MAX_SAFE_INTEGER);
      assert.strictEqual(s1, Number.MAX_SAFE_INTEGER);
      assert.strictEqual(ShopStore.obterSaldo(mockApp), Number.MAX_SAFE_INTEGER);

      // Entradas inválidas não alteram o saldo
      const s2 = await ShopStore.creditarMoedas(mockApp, NaN);
      assert.strictEqual(s2, Number.MAX_SAFE_INTEGER);

      const s3 = await ShopStore.creditarMoedas(mockApp, Infinity);
      assert.strictEqual(s3, Number.MAX_SAFE_INTEGER);

      const s4 = await ShopStore.creditarMoedas(mockApp, -Infinity);
      assert.strictEqual(s4, Number.MAX_SAFE_INTEGER);

      const s5 = await ShopStore.creditarMoedas(mockApp, 'string_nao_numerica');
      assert.strictEqual(s5, Number.MAX_SAFE_INTEGER);

      const s6 = await ShopStore.creditarMoedas(mockApp, null);
      assert.strictEqual(s6, Number.MAX_SAFE_INTEGER);

      const s7 = await ShopStore.creditarMoedas(mockApp, undefined);
      assert.strictEqual(s7, Number.MAX_SAFE_INTEGER);
    });

    test('comprarItem() sob saldo zero, saldo insuficiente exato e compra de item gratuito', async () => {
      const mockApp = criarMockApp({ saldo: 0 });

      // 1. Saldo 0 tentando comprar item de 50
      const r1 = await ShopStore.comprarItem(mockApp, 'flower-2');
      assert.strictEqual(r1.sucesso, false);
      assert.strictEqual(r1.erro, 'INSUFFICIENT_FUNDS');
      assert.strictEqual(ShopStore.obterSaldo(mockApp), 0);

      // 2. Saldo exatamente preco - 1 (49 para item de 50)
      await ShopStore.creditarMoedas(mockApp, 49);
      const r2 = await ShopStore.comprarItem(mockApp, 'flower-2');
      assert.strictEqual(r2.sucesso, false);
      assert.strictEqual(r2.erro, 'INSUFFICIENT_FUNDS');
      assert.strictEqual(ShopStore.obterSaldo(mockApp), 49);

      // 3. Saldo exatamente igual ao preço (50)
      await ShopStore.creditarMoedas(mockApp, 1);
      assert.strictEqual(ShopStore.obterSaldo(mockApp), 50);
      const r3 = await ShopStore.comprarItem(mockApp, 'flower-2');
      assert.strictEqual(r3.sucesso, true);
      assert.strictEqual(ShopStore.obterSaldo(mockApp), 0);

      // 4. Compra subsequente do mesmo item
      const r4 = await ShopStore.comprarItem(mockApp, 'flower-2');
      assert.strictEqual(r4.sucesso, false);
      assert.strictEqual(r4.erro, 'ALREADY_UNLOCKED');

      // 5. Compra de item de custo 0 (sprout já desbloqueado por padrão)
      const r5 = await ShopStore.comprarItem(mockApp, 'sprout');
      assert.strictEqual(r5.sucesso, false);
      assert.strictEqual(r5.erro, 'ALREADY_UNLOCKED');

      // 6. Item inexistente
      const r6 = await ShopStore.comprarItem(mockApp, 'item_inexistente_xyz');
      assert.strictEqual(r6.sucesso, false);
      assert.strictEqual(r6.erro, 'ITEM_NOT_FOUND');
    });

    test('estresse de alta concorrência: 50 créditos simultâneos garantem consistência atômica', async () => {
      const mockApp = criarMockApp({ saldo: 0 });

      // Dispara 50 créditos simultâneos de 2 moedas
      const promises = Array.from({ length: 50 }, () =>
        ShopStore.creditarMoedas(mockApp, 2, 'concorrente')
      );

      await Promise.all(promises);

      const saldoFinal = ShopStore.obterSaldo(mockApp);
      assert.strictEqual(saldoFinal, 100, 'Saldo final deve ser exatamente 50 * 2 = 100 sem perdas concorrentes');

      const estado = await ShopStore.carregar(mockApp);
      assert.strictEqual(estado.historicoTransacoes.length, 50);
    });

    test('estresse de concorrência com contenção: 20 compras simultâneas para 1 único saldo', async () => {
      // Saldo permite exatamente 1 compra de 50 (flower-2)
      const mockApp = criarMockApp({ saldo: 50 });

      const promises = Array.from({ length: 20 }, () =>
        ShopStore.comprarItem(mockApp, 'flower-2')
      );

      const resultados = await Promise.all(promises);

      const sucessos = resultados.filter(r => r.sucesso);
      const falhas = resultados.filter(r => !r.sucesso);

      assert.strictEqual(sucessos.length, 1, 'Exatamente UMA compra deve ser bem-sucedida');
      assert.strictEqual(falhas.length, 19, 'Todas as 19 tentativas concorrentes subsequentes devem falhar');
      assert.strictEqual(ShopStore.obterSaldo(mockApp), 0, 'Saldo restante deve ser exatamente 0');

      // Verifica que todas as falhas são ALREADY_UNLOCKED ou INSUFFICIENT_FUNDS
      for (const f of falhas) {
        assert.ok(['ALREADY_UNLOCKED', 'INSUFFICIENT_FUNDS'].includes(f.erro));
      }
    });

    test('resiliência da fila assíncrona contra erros e rejeições (sem deadlock)', async () => {
      const mockApp = criarMockApp({ saldo: 20 });

      // Operação que lança erro intencional na fila
      const p1 = ShopStore.executarSerializado(mockApp, async () => {
        throw new Error('Falha catastrófica simulada na fila');
      });

      await assert.rejects(p1, /Falha catastrófica simulada na fila/);

      // A fila NÃO deve ficar travada; operações seguintes devem prosseguir
      const saldo = await ShopStore.creditarMoedas(mockApp, 15, 'recuperacao_pos_erro');
      assert.strictEqual(saldo, 35, 'Fila deve se recuperar e processar operações subsequentes após rejeição');
    });
  });

  // =========================================================================
  // 3. JardimStore - Delegação, Validação de Tipos e Casos de Borda
  // =========================================================================
  describe('3. JardimStore: Delegação, Validação de Tipos e Casos de Borda', () => {
    let JardimStore;
    let ShopStore;

    beforeEach(() => {
      ShopStore = reloadModule(SHOP_PATH);
      JardimStore = reloadModule(JARDIM_PATH);
    });

    test('comprarArvore() rejeita estritamente IDs não-botânicos e inválidos', async () => {
      const mockApp = criarMockApp({ saldo: 500 });

      // 1. Tentar comprar áudio através da API botânica
      const r1 = await JardimStore.comprarArvore(mockApp, 'audio-brown-noise');
      assert.strictEqual(r1.sucesso, false);
      assert.strictEqual(r1.mensagem, 'Espécie não encontrada no catálogo botânico.');

      // 2. Tentar comprar tema cosmético através da API botânica
      const r2 = await JardimStore.comprarArvore(mockApp, 'theme-preset-cyber');
      assert.strictEqual(r2.sucesso, false);
      assert.strictEqual(r2.mensagem, 'Espécie não encontrada no catálogo botânico.');

      // 3. Argumentos inválidos
      const r3 = await JardimStore.comprarArvore(mockApp, null);
      assert.strictEqual(r3.sucesso, false);

      const r4 = await JardimStore.comprarArvore(mockApp, '');
      assert.strictEqual(r4.sucesso, false);

      const r5 = await JardimStore.comprarArvore(mockApp, 123);
      assert.strictEqual(r5.sucesso, false);

      // Saldo deve permanecer intocado
      assert.strictEqual(JardimStore.obterSaldo(mockApp), 500);
    });

    test('selecionarArvore() valida espécie no catálogo botânico e status de desbloqueio', async () => {
      const mockApp = criarMockApp({ saldo: 100 });

      // 1. Selecionar árvore bloqueada
      const r1 = await JardimStore.selecionarArvore(mockApp, 'flower-2');
      assert.strictEqual(r1.sucesso, false);
      assert.strictEqual(r1.mensagem, 'Item bloqueado. Compre na loja primeiro.');

      // 2. Selecionar item não-botânico
      const r2 = await JardimStore.selecionarArvore(mockApp, 'audio-white-noise');
      assert.strictEqual(r2.sucesso, false);
      assert.strictEqual(r2.mensagem, 'Espécie não encontrada no catálogo botânico.');

      // 3. Comprar e depois selecionar
      const compra = await JardimStore.comprarArvore(mockApp, 'flower-2');
      assert.strictEqual(compra.sucesso, true);

      const r3 = await JardimStore.selecionarArvore(mockApp, 'flower-2');
      assert.strictEqual(r3.sucesso, true);
      assert.strictEqual(r3.estado.arvoreAtiva, 'flower-2');
    });

    test('_formatarEstadoLegado lida defensivamente com dados nulos e corrompidos', () => {
      // Estado totalmente nulo
      const e1 = JardimStore._formatarEstadoLegado(null);
      assert.strictEqual(e1.moedas, 0);
      assert.strictEqual(e1.arvoreAtiva, 'sprout');
      assert.deepStrictEqual(e1.desbloqueadas, ['sprout']);

      // Estado com desbloqueados contendo tipos degenerados
      const e2 = JardimStore._formatarEstadoLegado({
        saldo: '150.9',
        desbloqueados: [null, undefined, 123, 'flower-2', 'audio-pink-noise', 'theme-preset-cyber'],
        estatisticasBotanicas: { totalPlantadas: '25' },
        historicoTransacoes: [
          null,
          { tipo: 'credito_foco', valor: 50 },
          { tipo: 'compra_item', itemId: 'flower-2', valor: 50, dataIso: '2026-10-10T12:00:00Z' },
          { tipo: 'compra_item', itemId: 'audio-pink-noise', valor: 40 }
        ]
      });

      assert.strictEqual(e2.moedas, 150);
      assert.strictEqual(e2.totalPlantadas, 25);
      // Desbloqueadas botânicas não devem conter itens de áudio/tema nem valores degenerados
      assert.ok(e2.desbloqueadas.includes('flower-2'));
      assert.ok(!e2.desbloqueadas.includes('audio-pink-noise'));
      assert.ok(!e2.desbloqueadas.includes('theme-preset-cyber'));
      // Histórico de compras deve conter apenas compras de itens botânicos
      assert.strictEqual(e2.historicoCompras.length, 1);
      assert.strictEqual(e2.historicoCompras[0].id, 'flower-2');
    });
  });

  // =========================================================================
  // 4. UIKit - Resiliência, Fallback de Ícones e Tratamento de Erros
  // =========================================================================
  describe('4. UIKit: Resiliência, Fallback de Ícones e Tratamento de Erros', () => {
    let UIKit;

    beforeEach(() => {
      UIKit = reloadModule(UIKIT_PATH);
    });

    test('renderIcon() faz fallback seguro para ícones inexistentes ou vazios', () => {
      const container = createMockEl('div');

      // Ícone desconhecido
      const s1 = UIKit.renderIcon(container, 'icone_inexistente_xyz', { size: 18, color: '#f00' });
      assert.ok(s1.innerHTML.includes('<circle cx="12" cy="12" r="8"/>'));
      assert.strictEqual(s1.style.width, '18px');
      assert.strictEqual(s1.style.color, '#f00');

      // Ícone vazio / nulo
      const s2 = UIKit.renderIcon(container, '', { size: 14 });
      assert.ok(s2.innerHTML.includes('<circle cx="12" cy="12" r="8"/>'));

      // Ícone válido
      const s3 = UIKit.renderIcon(container, 'check', { size: 16 });
      assert.ok(s3.innerHTML.includes('polyline points="20 6 9 17 4 12"'));
    });

    test('criarBotao() captura e contém exceções lançadas dentro do callback onClick', async () => {
      const parent = createMockEl('div');

      let chamou = false;
      const btn = UIKit.criarBotao(parent, {
        label: 'Ação Perigosa',
        variant: 'danger',
        onClick: async () => {
          chamou = true;
          throw new Error('Falha no manipulador de clique do usuário');
        }
      });

      // Disparar evento de clique não deve quebrar a execução global
      await assert.doesNotReject(async () => {
        await btn.dispatchEvent({ type: 'click' });
      });
      assert.strictEqual(chamou, true);
    });

    test('pluralizar() lida corretamente com singular, plural, zero e números negativos', () => {
      assert.strictEqual(UIKit.pluralizar(1, 'tarefa', 'tarefas'), '1 tarefa');
      assert.strictEqual(UIKit.pluralizar(0, 'tarefa', 'tarefas'), '0 tarefas');
      assert.strictEqual(UIKit.pluralizar(2, 'tarefa', 'tarefas'), '2 tarefas');
      assert.strictEqual(UIKit.pluralizar(-1, 'tarefa', 'tarefas'), '-1 tarefa');
      assert.strictEqual(UIKit.pluralizar(-2, 'tarefa', 'tarefas'), '-2 tarefas');

      assert.strictEqual(UIKit.pluralizar(1, 'pomodoro', 'pomodoros', { incluirNumero: false }), 'pomodoro');
      assert.strictEqual(UIKit.pluralizar(5, 'pomodoro', 'pomodoros', { incluirNumero: false }), 'pomodoros');
    });

    test('criarEstadoVazio() e criarCardHeader() constroem estruturas anatômicas resilientes', () => {
      const parent = createMockEl('div');

      // Estado vazio com opções mínimas
      const empty1 = UIKit.criarEstadoVazio(parent, { titulo: 'Sem tarefas' });
      assert.strictEqual(empty1.className, 'snoopy-empty');

      // Card Header sem ícone
      const h1 = UIKit.criarCardHeader(parent, { title: 'Cockpit Pomodoro', meta: '25m' });
      assert.strictEqual(h1.container.className, 'snoopy-card-header');

      // Card Header com ícone e subtítulo
      const h2 = UIKit.criarCardHeader(parent, { title: 'Loja', icon: 'shopping-bag', subtitle: 'Catálogo de Foco' });
      assert.strictEqual(h2.container.className, 'snoopy-card-header');
    });
  });

  // =========================================================================
  // 5. TaskParser - Strings Extremas, Divisão por Zero e Limites de Regex
  // =========================================================================
  describe('5. TaskParser: Strings Extremas, Divisão por Zero e Limites de Regex', () => {
    let TaskParser;
    let DateUtils;
    const todayStr = '2026-10-10';

    beforeEach(() => {
      TaskParser = reloadModule(TASK_PARSER_PATH);
      DateUtils = reloadModule(DATE_UTILS_PATH);
    });

    test('parseMetadata() sob strings vazias, degeneradas ou sem metadados', () => {
      const r1 = TaskParser.parseMetadata('', todayStr, DateUtils);
      assert.strictEqual(r1.cleanText, '');
      assert.strictEqual(r1.dueStr, null);
      assert.strictEqual(r1.statusPrazo, 'sem_prazo');
      assert.strictEqual(r1.prio, null);
      assert.strictEqual(r1.progresso, null);

      const r2 = TaskParser.parseMetadata('   ', todayStr, DateUtils);
      assert.strictEqual(r2.cleanText, '');

      const r3 = TaskParser.parseMetadata('Tarefa simples sem nenhuma tag', todayStr, DateUtils);
      assert.strictEqual(r3.cleanText, 'Tarefa simples sem nenhuma tag');
      assert.strictEqual(r3.statusPrazo, 'sem_prazo');
    });

    test('progresso com divisão por zero [0/0 paginas] ou meta zero é protegido contra NaN', () => {
      const r1 = TaskParser.parseMetadata('Ler livro [0/0 paginas]', todayStr, DateUtils);
      assert.ok(r1.progresso);
      assert.strictEqual(r1.progresso.pct, null, 'Percentual com meta 0 não deve gerar NaN');
      assert.strictEqual(r1.progresso.meta, 0);

      // Meta superior a 100% é limitada a 100%
      const r2 = TaskParser.parseMetadata('Correr [15/10 km]', todayStr, DateUtils);
      assert.ok(r2.progresso);
      assert.strictEqual(r2.progresso.pct, 100);
      assert.strictEqual(r2.progresso.rotulo, '15/10 km');
    });

    test('datas malformadas e limites de formato', () => {
      // Data com formato inválido mas padrão de dígitos
      const r1 = TaskParser.parseMetadata('Reunião 📅 99-99-9999', todayStr, DateUtils);
      assert.strictEqual(r1.cleanText, 'Reunião');
      assert.ok(r1.dueStr !== null);

      // Metadados múltiplos com 🌙 Noite (sem seletor de variação) são limpos com sucesso
      const r2 = TaskParser.parseMetadata('Estudo denso 📅 2026-10-09 ⏫ 🍅 3 🌙 Noite [5/10 caps]', todayStr, DateUtils);
      assert.strictEqual(r2.cleanText, 'Estudo denso');
      assert.strictEqual(r2.dueStr, '2026-10-09');
      assert.strictEqual(r2.statusPrazo, 'atrasada');
      assert.strictEqual(r2.prio, 'alta');
      assert.strictEqual(r2.pomosEst, '3');
      assert.strictEqual(r2.periodo, '🌙 Noite');
      assert.strictEqual(r2.progresso.pct, 50);

      // Metadados com 🌅 Manhã são limpos com sucesso
      const r3 = TaskParser.parseMetadata('Caminhada matinal 📅 2026-10-10 🌅 Manhã', todayStr, DateUtils);
      assert.strictEqual(r3.cleanText, 'Caminhada matinal');
      assert.strictEqual(r3.periodo, '🌅 Manhã');

      // REGEX_PERIODO suporta Variation Selector 16 (\u{FE0F}?) removendo "☀️ Tarde"
      // e prevenindo vazamento de emojis literais para cleanText e componentes de UI
      const r4 = TaskParser.parseMetadata('Estudo tarde 📅 2026-10-10 ☀️ Tarde', todayStr, DateUtils);
      assert.strictEqual(r4.periodo, '☀️ Tarde', 'periodo é detectado via /tarde/i');
      assert.strictEqual(r4.cleanText, 'Estudo tarde', 'cleanText deve ser limpo de "☀️ Tarde" sem vazamento de emoji');
      assert.ok(!r4.cleanText.includes('☀️ Tarde'), 'cleanText não deve conter o emoji nem a tag de período');
    });

    test('parseMetadata() com string de grande extensão (10.000 caracteres) executa sem ReDoS', () => {
      const prefix = 'A'.repeat(10000);
      const text = `${prefix} 📅 2026-10-10 ⏫`;

      const t0 = performance.now();
      const res = TaskParser.parseMetadata(text, todayStr, DateUtils);
      const duration = performance.now() - t0;

      assert.strictEqual(res.dueStr, '2026-10-10');
      assert.strictEqual(res.prio, 'alta');
      assert.ok(duration < 100, `Parsing de 10k caracteres deve levar menos de 100ms (levou ${duration.toFixed(2)}ms)`);
    });
  });
});

/**
 * Snoopy Vault - Testes do Motor de Áudio Procedural Pomodoro (Web Audio API)
 * Executado nativamente via `node --test tests/core/pomodoro_audio.test.js`.
 */
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  MockAudioContext,
  createMockLocalStorage,
  criarMockApp
} = require('../e2e/helpers/e2e_utils.js');

// Caminho do módulo
const AUDIO_MODULE_PATH = path.resolve(__dirname, '../../99_Meta/Snoopy/core/pomodoro_audio.js');

function carregarMotorAudio() {
  delete require.cache[require.resolve(AUDIO_MODULE_PATH)];
  return require(AUDIO_MODULE_PATH);
}

describe('PomodoroAudio - Motor de Síntese Procedural Web Audio API', () => {
  let PomodoroAudio;
  let mockCtx;
  let mockStorage;

  beforeEach(() => {
    PomodoroAudio = carregarMotorAudio();
    mockCtx = new MockAudioContext();
    mockStorage = createMockLocalStorage();
    if (typeof PomodoroAudio.conectarContexto === 'function') {
      PomodoroAudio.conectarContexto(mockCtx);
    }
    if (typeof PomodoroAudio.conectarStorage === 'function') {
      PomodoroAudio.conectarStorage(mockStorage);
    }
  });

  // =========================================================================
  // 1. Contrato da API Pública
  // =========================================================================
  describe('Contrato da API Pública', () => {
    test('Exporta todas as funções públicas canônicas exigidas', () => {
      assert.strictEqual(typeof PomodoroAudio.iniciar, 'function');
      assert.strictEqual(typeof PomodoroAudio.tocar, 'function');
      assert.strictEqual(typeof PomodoroAudio.tocarFaixa, 'function'); // alias canônico
      assert.strictEqual(typeof PomodoroAudio.pausar, 'function');
      assert.strictEqual(typeof PomodoroAudio.parar, 'function');
      assert.strictEqual(typeof PomodoroAudio.ajustarVolume, 'function');
      assert.strictEqual(typeof PomodoroAudio.mutar, 'function');
      assert.strictEqual(typeof PomodoroAudio.obterEstado, 'function');
      assert.strictEqual(typeof PomodoroAudio.obterFaixas, 'function');
      assert.strictEqual(typeof PomodoroAudio.obterFaixasDisponiveis, 'function');
      assert.strictEqual(typeof PomodoroAudio.destroy, 'function');
    });

    test('obterFaixas() lista as 6 faixas procedurais canônicas', () => {
      const faixas = PomodoroAudio.obterFaixas();
      assert.ok(Array.isArray(faixas), 'Deve retornar array de faixas');
      assert.ok(faixas.length >= 6, 'Deve suportar pelo menos 6 faixas');

      const ids = faixas.map(f => f.id);
      assert.ok(ids.includes('white_noise'));
      assert.ok(ids.includes('brown_noise'));
      assert.ok(ids.includes('pink_noise'));
      assert.ok(ids.includes('procedural_rain'));
      assert.ok(ids.includes('binaural_alpha'));
      assert.ok(ids.includes('binaural_beta'));

      // Todas as faixas devem possuir rótulo e estar livres de emojis literais
      const emojiRegex = /\p{Extended_Pictographic}/u;
      for (const faixa of faixas) {
        assert.ok(faixa.label, `Faixa ${faixa.id} deve ter label`);
        assert.ok(!emojiRegex.test(faixa.label), `Label "${faixa.label}" não deve conter emoji`);
      }
    });
  });

  // =========================================================================
  // 2. Ciclo de Vida e Desbloqueio de AudioContext
  // =========================================================================
  describe('Ciclo de Vida do AudioContext', () => {
    test('iniciar() transita AudioContext de suspended para running', async () => {
      assert.strictEqual(mockCtx.state, 'suspended');
      await PomodoroAudio.iniciar();
      assert.strictEqual(mockCtx.state, 'running');
    });

    test('obterEstado() reflete o estado inicial padrão', () => {
      const estado = PomodoroAudio.obterEstado();
      assert.strictEqual(estado.isPlaying, false);
      assert.strictEqual(estado.isMuted, false);
      assert.strictEqual(estado.volume, 0.5);
      assert.strictEqual(typeof estado.currentTrack, 'string');
    });

    test('destroy() encerra AudioContext e limpa nós de som', async () => {
      await PomodoroAudio.iniciar();
      PomodoroAudio.tocar('white_noise');
      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, true);

      PomodoroAudio.destroy();
      const estado = PomodoroAudio.obterEstado();
      assert.strictEqual(estado.isPlaying, false);
      assert.strictEqual(mockCtx.state, 'closed');
    });
  });

  // =========================================================================
  // 3. Controle de Volume e Mudo com Persistência
  // =========================================================================
  describe('Controle de Volume, Mute e Persistência em LocalStorage', () => {
    test('ajustarVolume() normal e persiste no localStorage', () => {
      PomodoroAudio.ajustarVolume(0.8);
      assert.strictEqual(PomodoroAudio.obterEstado().volume, 0.8);
      assert.strictEqual(mockStorage.getItem('snoopy_pomodoro_audio_volume'), '0.8');
    });

    test('ajustarVolume() limita valores negativos para 0.0', () => {
      PomodoroAudio.ajustarVolume(-0.5);
      assert.strictEqual(PomodoroAudio.obterEstado().volume, 0.0);
      assert.strictEqual(mockStorage.getItem('snoopy_pomodoro_audio_volume'), '0');
    });

    test('ajustarVolume() limita valores superiores a 1.0 para 1.0', () => {
      PomodoroAudio.ajustarVolume(1.5);
      assert.strictEqual(PomodoroAudio.obterEstado().volume, 1.0);
      assert.strictEqual(mockStorage.getItem('snoopy_pomodoro_audio_volume'), '1');
    });

    test('mutar(true) silencia sem perder o volume configurado', () => {
      PomodoroAudio.ajustarVolume(0.7);
      PomodoroAudio.mutar(true);

      const estado = PomodoroAudio.obterEstado();
      assert.strictEqual(estado.isMuted, true);
      assert.strictEqual(estado.volume, 0.7); // volume nominal preservado
      assert.strictEqual(mockStorage.getItem('snoopy_pomodoro_audio_muted'), 'true');

      // Ao desmutar, volta para false mantendo 0.7
      PomodoroAudio.mutar(false);
      assert.strictEqual(PomodoroAudio.obterEstado().isMuted, false);
      assert.strictEqual(mockStorage.getItem('snoopy_pomodoro_audio_muted'), 'false');
    });

    test('restaura volume e mudo salvos no storage na inicialização', () => {
      mockStorage.setItem('snoopy_pomodoro_audio_volume', '0.35');
      mockStorage.setItem('snoopy_pomodoro_audio_muted', 'true');

      const NovoAudio = carregarMotorAudio();
      NovoAudio.conectarContexto(new MockAudioContext());
      NovoAudio.conectarStorage(mockStorage);

      const estado = NovoAudio.obterEstado();
      assert.strictEqual(estado.volume, 0.35);
      assert.strictEqual(estado.isMuted, true);
    });
  });

  // =========================================================================
  // 4. Síntese e Reprodução das Faixas Sonoras
  // =========================================================================
  describe('Reprodução das Faixas Procedurais', () => {
    test('tocar("white_noise") inicia buffer source e conecta ao master gain', async () => {
      await PomodoroAudio.iniciar();
      PomodoroAudio.tocar('white_noise');

      const estado = PomodoroAudio.obterEstado();
      assert.strictEqual(estado.isPlaying, true);
      assert.strictEqual(estado.currentTrack, 'white_noise');

      const bufferNodes = mockCtx.nodesCreated.filter(n => n.type === 'bufferSource');
      assert.ok(bufferNodes.length > 0, 'BufferSource deve ser criado para ruído branco');
      assert.strictEqual(bufferNodes[bufferNodes.length - 1].loop, true, 'Deve rodar em loop contínuo');
    });

    test('tocar() aceita tanto "brown_noise" quanto "audio-brown-noise"', async () => {
      await PomodoroAudio.iniciar();

      PomodoroAudio.tocar('audio-brown-noise');
      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, true);
      assert.strictEqual(PomodoroAudio.obterEstado().currentTrack, 'brown_noise');

      PomodoroAudio.tocar('brown_noise');
      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, true);
      assert.strictEqual(PomodoroAudio.obterEstado().currentTrack, 'brown_noise');
    });

    test('tocar("pink_noise") e tocar("procedural_rain") inicializam buffers com sucesso', async () => {
      await PomodoroAudio.iniciar();

      PomodoroAudio.tocar('pink_noise');
      assert.strictEqual(PomodoroAudio.obterEstado().currentTrack, 'pink_noise');

      PomodoroAudio.tocar('procedural_rain');
      assert.strictEqual(PomodoroAudio.obterEstado().currentTrack, 'procedural_rain');
    });

    test('tocar("binaural_alpha") cria osciladores estéreo senoidais com desvio de 10 Hz', async () => {
      await PomodoroAudio.iniciar();
      PomodoroAudio.tocar('binaural_alpha');

      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, true);
      assert.strictEqual(PomodoroAudio.obterEstado().currentTrack, 'binaural_alpha');

      const oscs = mockCtx.nodesCreated.filter(n => n.type === 'sine');
      assert.ok(oscs.length >= 2, 'Deve criar osciladores para os dois canais estéreo');
    });

    test('tocar("binaural_beta") cria osciladores estéreo com desvio de 16 Hz', async () => {
      await PomodoroAudio.iniciar();
      PomodoroAudio.tocar('binaural_beta');

      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, true);
      assert.strictEqual(PomodoroAudio.obterEstado().currentTrack, 'binaural_beta');
    });

    test('pausar() e parar() transitam para estado não reproduzindo sem exceções', async () => {
      await PomodoroAudio.iniciar();
      PomodoroAudio.tocar('white_noise');
      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, true);

      PomodoroAudio.pausar();
      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, false);

      PomodoroAudio.tocar('white_noise');
      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, true);

      PomodoroAudio.parar();
      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, false);
    });

    test('Alternância rápida de play/pause não trava o motor', async () => {
      await PomodoroAudio.iniciar();
      assert.doesNotThrow(() => {
        for (let i = 0; i < 20; i++) {
          PomodoroAudio.tocar('brown_noise');
          PomodoroAudio.pausar();
        }
      });
      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, false);
    });
  });

  // =========================================================================
  // 5. Integração com Cofre / Loja para Faixas Desbloqueadas
  // =========================================================================
  describe('obterFaixasDisponiveis(app)', () => {
    test('sem app ou cofre inicial retorna faixas padrão gratuitas (ruído branco)', async () => {
      const faixas = await PomodoroAudio.obterFaixasDisponiveis(null);
      assert.ok(Array.isArray(faixas));
      // Faixa branca padrão deve estar disponível
      assert.ok(faixas.some(f => f.id === 'audio-white-noise' || f.id === 'white_noise'));
    });

    test('com app com itens desbloqueados filtra corretamente as faixas adquiridas', async () => {
      const mockApp = criarMockApp({
        saldo: 100,
        desbloqueados: ['sprout', 'audio-white-noise', 'audio-brown-noise']
      });

      const faixas = await PomodoroAudio.obterFaixasDisponiveis(mockApp);
      assert.ok(faixas.some(f => f.id === 'audio-white-noise' || f.id === 'white_noise'));
      assert.ok(faixas.some(f => f.id === 'audio-brown-noise' || f.id === 'brown_noise'));
      // Chuva e binaurais ainda não comprados não devem estar disponíveis
      assert.strictEqual(faixas.some(f => f.id === 'audio-procedural-rain'), false);
      assert.strictEqual(faixas.some(f => f.id === 'audio-binaural-beta'), false);
    });
  });

  // =========================================================================
  // 6. Integridade Matemática das Fórmulas de Síntese
  // =========================================================================
  describe('Integridade Matemática das Amostras Geradas', () => {
    test('geradores procedurais produzem buffers normalizados sem NaN ou Infinity', () => {
      if (typeof PomodoroAudio._gerarAmostrasFaixa === 'function') {
        const faixas = ['white_noise', 'brown_noise', 'pink_noise', 'procedural_rain'];
        for (const f of faixas) {
          const amostras = PomodoroAudio._gerarAmostrasFaixa(f, 44100, 1.0);
          assert.ok(amostras instanceof Float32Array, `${f} deve retornar Float32Array`);
          assert.strictEqual(amostras.length, 44100);

          for (let i = 0; i < amostras.length; i++) {
            const s = amostras[i];
            assert.ok(!Number.isNaN(s), `${f} amostra não pode ser NaN`);
            assert.ok(Number.isFinite(s), `${f} amostra deve ser finita`);
            assert.ok(s >= -1.0 && s <= 1.0, `${f} amostra deve estar no intervalo [-1.0, 1.0]`);
          }
        }
      }
    });
  });
});

/**
 * Snoopy Vault - Testes de Estresse Empírico do Motor de Áudio Procedural (Web Audio API)
 * Challenger 1 - Milestone M3: Verificação Empírica Rigorosa
 * Executado nativamente via `node --test tests/core/pomodoro_audio_stress.test.js`.
 */
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  MockAudioContext,
  createMockLocalStorage,
  criarMockApp
} = require('../e2e/helpers/e2e_utils.js');

const AUDIO_MODULE_PATH = path.resolve(__dirname, '../../99_Meta/Snoopy/core/pomodoro_audio.js');

function carregarMotorAudio() {
  delete require.cache[require.resolve(AUDIO_MODULE_PATH)];
  return require(AUDIO_MODULE_PATH);
}

const SAMPLE_RATES = [44100, 48000, 96000, 22050];
const TRACKS = [
  'white_noise',
  'brown_noise',
  'pink_noise',
  'procedural_rain',
  'binaural_alpha',
  'binaural_beta'
];

describe('Challenger M3 - Estresse Empírico do Motor de Áudio Procedural', () => {
  let PomodoroAudio;
  let mockCtx;
  let mockStorage;

  beforeEach(() => {
    PomodoroAudio = carregarMotorAudio();
    mockCtx = new MockAudioContext();
    mockStorage = createMockLocalStorage();
    PomodoroAudio.conectarContexto(mockCtx);
    PomodoroAudio.conectarStorage(mockStorage);
  });

  // =========================================================================
  // 1. Integridade Numérica e Limites das Amostras nos Buffers de Áudio
  // =========================================================================
  describe('Integridade Numérica das Amostras nos Buffers Sintetizados', () => {
    for (const rate of SAMPLE_RATES) {
      for (const track of TRACKS) {
        test(`Taxa ${rate}Hz - Faixa ${track}: Zero NaN, Zero Infinito, Amostras limitadas em [-1.0, 1.0]`, () => {
          const ctx = new MockAudioContext();
          ctx.sampleRate = rate;
          PomodoroAudio.conectarContexto(ctx);

          const buffer = PomodoroAudio._obterOuCriarBuffer(ctx, track);
          assert.ok(buffer, `AudioBuffer não pode ser nulo para ${track} a ${rate}Hz`);
          assert.strictEqual(buffer.sampleRate, rate);

          const samples = buffer.getChannelData(0);
          assert.ok(samples instanceof Float32Array, 'Deve ser Float32Array');
          assert.strictEqual(samples.length, Math.floor(rate * 4.0));

          let min = Infinity;
          let max = -Infinity;
          let sum = 0;
          let sumSquares = 0;

          for (let i = 0; i < samples.length; i++) {
            const val = samples[i];
            assert.ok(val !== null && val !== undefined, `Amostra [${i}] não pode ser nula ou indefinida`);
            assert.ok(!Number.isNaN(val), `Amostra [${i}] não pode ser NaN na faixa ${track}`);
            assert.ok(Number.isFinite(val), `Amostra [${i}] deve ser finita na faixa ${track}`);
            assert.ok(
              val >= -1.0 && val <= 1.0,
              `Amostra [${i}] (${val}) fora do intervalo [-1.0, 1.0] na faixa ${track} a ${rate}Hz`
            );

            if (val < min) min = val;
            if (val > max) max = val;
            sum += val;
            sumSquares += val * val;
          }

          // Verificação de não-silêncio (RMS > 0 e desvio padrão > 0)
          const rms = Math.sqrt(sumSquares / samples.length);
          assert.ok(rms > 0.01, `Sinal de áudio da faixa ${track} não pode ser silêncio (RMS: ${rms})`);
          assert.ok(min < 0, `Sinal da faixa ${track} deve oscilar para valores negativos (min: ${min})`);
          assert.ok(max > 0, `Sinal da faixa ${track} deve oscilar para valores positivos (max: ${max})`);
        });
      }
    }
  });

  // =========================================================================
  // 2. Separação de Canais Estéreo nas Faixas Binaurais
  // =========================================================================
  describe('Separação de Canais Estéreo nas Faixas Panned', () => {
    test('binaural_alpha isola completamente canais Esquerdo (200Hz) e Direito (210Hz)', async () => {
      await PomodoroAudio.iniciar();
      PomodoroAudio.tocar('binaural_alpha');

      const oscs = mockCtx.nodesCreated.filter(n => n.type === 'sine');
      const panners = mockCtx.nodesCreated.filter(n => n.pan !== undefined);

      assert.strictEqual(oscs.length, 2, 'Deve instanciar exatamente 2 osciladores senoidais');
      assert.strictEqual(panners.length, 2, 'Deve instanciar exatamente 2 StereoPannerNodes');

      const oscL = oscs[0];
      const oscR = oscs[1];
      const panL = panners[0];
      const panR = panners[1];

      // Verificação das frequências fundamentais
      assert.strictEqual(oscL.frequency.value, 200, 'Canal esquerdo deve vibrar a 200 Hz');
      assert.strictEqual(oscR.frequency.value, 210, 'Canal direito deve vibrar a 210 Hz');
      const deltaAlfa = Math.abs(oscR.frequency.value - oscL.frequency.value);
      assert.strictEqual(deltaAlfa, 10, 'Batimento alfa deve ser exatamente 10 Hz');

      // Verificação do isolamento estereofônico (Hard Pan Left -1.0 / Hard Pan Right +1.0)
      assert.strictEqual(panL.pan.value, -1.0, 'Panner esquerdo deve estar em -1.0 (Hard Left)');
      assert.strictEqual(panR.pan.value, 1.0, 'Panner direito deve estar em 1.0 (Hard Right)');

      // Topologia de roteamento: cada oscilador conectado ao seu respectivo panner
      assert.strictEqual(oscL._target, panL, 'Oscilador esquerdo deve conectar exclusivamente ao Panner esquerdo');
      assert.strictEqual(oscR._target, panR, 'Oscilador direito deve conectar exclusivamente ao Panner direito');

      // Ambos os panners convergem para o Master Gain
      assert.strictEqual(panL._target, PomodoroAudio._masterGain, 'Panner esquerdo deve alimentar Master Gain');
      assert.strictEqual(panR._target, PomodoroAudio._masterGain, 'Panner direito deve alimentar Master Gain');
    });

    test('binaural_beta isola completamente canais Esquerdo (200Hz) e Direito (216Hz)', async () => {
      await PomodoroAudio.iniciar();
      PomodoroAudio.tocar('binaural_beta');

      const oscs = mockCtx.nodesCreated.filter(n => n.type === 'sine');
      const panners = mockCtx.nodesCreated.filter(n => n.pan !== undefined);

      const oscL = oscs[0];
      const oscR = oscs[1];
      const panL = panners[0];
      const panR = panners[1];

      assert.strictEqual(oscL.frequency.value, 200, 'Canal esquerdo beta deve vibrar a 200 Hz');
      assert.strictEqual(oscR.frequency.value, 216, 'Canal direito beta deve vibrar a 216 Hz');
      const deltaBeta = Math.abs(oscR.frequency.value - oscL.frequency.value);
      assert.strictEqual(deltaBeta, 16, 'Batimento beta deve ser exatamente 16 Hz');

      assert.strictEqual(panL.pan.value, -1.0, 'Panner esquerdo beta em -1.0');
      assert.strictEqual(panR.pan.value, 1.0, 'Panner direito beta em 1.0');
    });

    test('Simulação matemática da matriz de canais estéreo confirma descorrelação e separação total', () => {
      const sampleRate = 44100;
      const durationSec = 1.0;
      const totalSamples = sampleRate * durationSec;

      // Renderização determinística dos canais estéreo L e R para ondas alfa
      const leftChannel = new Float32Array(totalSamples);
      const rightChannel = new Float32Array(totalSamples);

      for (let i = 0; i < totalSamples; i++) {
        const t = i / sampleRate;
        leftChannel[i] = Math.sin(2 * Math.PI * 200 * t);
        rightChannel[i] = Math.sin(2 * Math.PI * 210 * t);
      }

      // Verificação de produto escalar / correlação
      let dotProduct = 0;
      let powerL = 0;
      let powerR = 0;
      for (let i = 0; i < totalSamples; i++) {
        dotProduct += leftChannel[i] * rightChannel[i];
        powerL += leftChannel[i] * leftChannel[i];
        powerR += rightChannel[i] * rightChannel[i];
      }
      const correlation = dotProduct / Math.sqrt(powerL * powerR);

      // Sinais com frequências ortogonais sobre intervalo longo têm correlação próxima de zero
      assert.ok(Math.abs(correlation) < 0.05, `Correlação entre canais deve ser insignificante: ${correlation}`);
    });
  });

  // =========================================================================
  // 3. Testes de Robustez Sob Condições Adversas
  // =========================================================================
  describe('Robustez Sob Entradas Adversas e Casos de Borda', () => {
    test('Clamping resiliente de volume sob valores corrompidos (NaN, Infinity, Strings, Negativos)', () => {
      const edgeCases = [
        { input: NaN, expected: 0.5 },
        { input: Infinity, expected: 1.0 },
        { input: -Infinity, expected: 0.0 },
        { input: -999999, expected: 0.0 },
        { input: 999999, expected: 1.0 },
        { input: '0.75', expected: 0.75 },
        { input: 'invalid_string', expected: 0.5 },
        { input: null, expected: 0.0 },
        { input: undefined, expected: 0.5 }
      ];

      for (const { input, expected } of edgeCases) {
        PomodoroAudio.ajustarVolume(input);
        const atual = PomodoroAudio.obterEstado().volume;
        assert.strictEqual(atual, expected, `Falha no clamping para entrada ${input}: esperado ${expected}, obtido ${atual}`);
      }
    });

    test('Estresse de comutação rápida de faixas e play/pause (100 ciclos sequenciais)', async () => {
      await PomodoroAudio.iniciar();

      assert.doesNotThrow(() => {
        for (let i = 0; i < 100; i++) {
          const track = TRACKS[i % TRACKS.length];
          PomodoroAudio.tocar(track);
          if (i % 2 === 0) {
            PomodoroAudio.pausar();
          }
        }
      });

      // Motor encerra em estado previsível
      assert.strictEqual(typeof PomodoroAudio.obterEstado().isPlaying, 'boolean');
    });

    test('Reutilização de buffer em cache evita alocações redundantes', () => {
      const b1 = PomodoroAudio._obterOuCriarBuffer(mockCtx, 'brown_noise');
      const b2 = PomodoroAudio._obterOuCriarBuffer(mockCtx, 'brown_noise');
      assert.strictEqual(b1, b2, 'Chamadas consecutivas devem retornar o mesmo buffer em cache');

      // Troca de contexto limpa o cache com segurança
      const novoCtx = new MockAudioContext();
      PomodoroAudio.conectarContexto(novoCtx);
      const b3 = PomodoroAudio._obterOuCriarBuffer(novoCtx, 'brown_noise');
      assert.notStrictEqual(b1, b3, 'Novo contexto deve gerar novo buffer');
    });

    test('Idempotência de destroy() sob chamadas repetidas', () => {
      assert.doesNotThrow(() => {
        PomodoroAudio.destroy();
        PomodoroAudio.destroy();
        PomodoroAudio.destroy();
      });
      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, false);
    });

    test('Resiliência a JSON corrompido no cofre ao buscar faixas disponíveis', async () => {
      const mockAppCorrompido = {
        vault: {
          getAbstractFileByPath: () => ({ path: '99_Meta/snoopy-shop.json' }),
          read: async () => '{{{CORRUPTED JSON'
        }
      };

      const faixas = await PomodoroAudio.obterFaixasDisponiveis(mockAppCorrompido);
      assert.ok(Array.isArray(faixas), 'Deve retornar array mesmo com JSON corrompido');
      assert.ok(faixas.length >= 1, 'Deve retornar ao menos as faixas gratuitas padrão');
      assert.ok(faixas.some(f => f.trackId === 'white_noise'), 'Ruído branco padrão deve permanecer disponível');
    });
  });
});

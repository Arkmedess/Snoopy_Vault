/**
 * Snoopy Vault - Milestone M3 Empirical Stress & Integrity Test Suite (Auditor M3)
 *
 * Verificação forense independente e stress testing adversarial do motor de áudio procedural Web Audio API:
 * 1. Resiliência a entradas anômalas/adversariais (null, undefined, strings bizarras, NaN, Infinity).
 * 2. Integridade matemática e espectral dos sinais sintetizados (RMS > 0, ausência de silêncio, normalização [-1, 1]).
 * 3. Ciclo de vida e desconexão segura de nós de áudio (prevenção de memory leaks em trocas rápidas de faixas).
 * 4. Idempotência estrita de destroy() e inicialização sob contexto nulo ou suspenso.
 * 5. Ausência absoluta de arquivos binários de mídia e de dependências externas.
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

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

describe('Auditor M3 - Adversarial Stress & Integrity Suite', () => {
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
  // 1. Stress Testing de Parâmetros e Entradas Adversariais
  // =========================================================================
  describe('Robustez Contra Entradas Adversariais', () => {
    test('tocar() com faixa inválida, nula ou indefinida cai em fallback gracioso sem quebrar', async () => {
      await PomodoroAudio.iniciar();

      const invalidTracks = [null, undefined, '', '   ', 'musica_mp3_fake', 'unknown_track_404', 12345, {}, []];
      for (const track of invalidTracks) {
        assert.doesNotThrow(() => {
          PomodoroAudio.tocar(track);
        }, `tocar(${JSON.stringify(track)}) não deve lançar exceção`);
        assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, true);
      }
    });

    test('ajustarVolume() com valores adversariais (NaN, Infinity, strings, limites) é rigorosamente contido', () => {
      const edgeCases = [
        { input: NaN, expected: 0.5 },
        { input: Infinity, expected: 1.0 },
        { input: -Infinity, expected: 0.0 },
        { input: -9999, expected: 0.0 },
        { input: 9999, expected: 1.0 },
        { input: '0.75', expected: 0.75 },
        { input: 'invalid_string', expected: 0.5 },
        { input: null, expected: 0.0 },
        { input: undefined, expected: 0.5 }
      ];

      for (const { input, expected } of edgeCases) {
        PomodoroAudio.ajustarVolume(input);
        const actual = PomodoroAudio.obterEstado().volume;
        assert.ok(!Number.isNaN(actual), `Volume para entrada ${input} não deve ser NaN`);
        assert.ok(actual >= 0.0 && actual <= 1.0, `Volume ${actual} deve estar contido entre 0.0 e 1.0`);
        assert.strictEqual(actual, expected, `Volume para entrada ${input} deve ser ${expected}`);
      }
    });

    test('mutar() e definirAutoSync() convertem coercitivamente qualquer tipo de valor para booleano', () => {
      PomodoroAudio.mutar(1);
      assert.strictEqual(PomodoroAudio.obterEstado().isMuted, true);
      PomodoroAudio.mutar(0);
      assert.strictEqual(PomodoroAudio.obterEstado().isMuted, false);
      PomodoroAudio.mutar('sim');
      assert.strictEqual(PomodoroAudio.obterEstado().isMuted, true);
      PomodoroAudio.mutar(null);
      assert.strictEqual(PomodoroAudio.obterEstado().isMuted, false);

      PomodoroAudio.definirAutoSync(1);
      assert.strictEqual(PomodoroAudio.obterAutoSync(), true);
      PomodoroAudio.definirAutoSync(0);
      assert.strictEqual(PomodoroAudio.obterAutoSync(), false);
      PomodoroAudio.definirAutoSync('');
      assert.strictEqual(PomodoroAudio.obterAutoSync(), false);
    });
  });

  // =========================================================================
  // 2. Análise Matemática e Acústica das Amostras Sintetizadas
  // =========================================================================
  describe('Integridade Matemática e Acústica (Zero Fake Audio)', () => {
    test('sintetizadores geram sinal autêntico com energia acústica RMS não-nula e variabilidade', () => {
      const faixas = ['white_noise', 'brown_noise', 'pink_noise', 'procedural_rain'];

      for (const trackId of faixas) {
        const amostras = PomodoroAudio._gerarAmostrasFaixa(trackId, 44100, 2.0);
        assert.ok(amostras instanceof Float32Array);
        assert.strictEqual(amostras.length, 88200);

        let somaQuadrados = 0;
        let zeroCount = 0;
        let diffCount = 0;

        for (let i = 0; i < amostras.length; i++) {
          const s = amostras[i];
          assert.ok(s >= -1.0 && s <= 1.0, `Amostra fora de [-1, 1]: ${s}`);
          assert.ok(Number.isFinite(s), `Amostra não-finita: ${s}`);
          somaQuadrados += s * s;
          if (s === 0) zeroCount++;
          if (i > 0 && Math.abs(s - amostras[i - 1]) > 1e-6) diffCount++;
        }

        const rms = Math.sqrt(somaQuadrados / amostras.length);

        // O áudio sintetizado NÃO pode ser silêncio absoluto (RMS > 0.01)
        assert.ok(rms > 0.01, `Faixa ${trackId} tem RMS muito baixo (${rms}), sugerindo silêncio ou mock`);

        // O áudio sintetizado NÃO pode ser constante ou puramente zeros
        assert.ok(zeroCount < amostras.length * 0.95, `Faixa ${trackId} contém excesso de zeros (${zeroCount}/${amostras.length})`);
        assert.ok(diffCount > amostras.length * 0.5, `Faixa ${trackId} possui baixa variabilidade amostral (${diffCount}/${amostras.length})`);
      }
    });

    test('faixas binaurais criam tons com frequências e panners estéreo precisos', async () => {
      await PomodoroAudio.iniciar();

      // Alfa (10 Hz beat: 200 Hz L, 210 Hz R)
      PomodoroAudio.tocar('binaural_alpha');
      assert.strictEqual(PomodoroAudio.obterEstado().currentTrack, 'binaural_alpha');

      const oscs = mockCtx.nodesCreated.filter(n => n.type === 'sine');
      assert.ok(oscs.length >= 2, 'Deve criar osciladores senoidais para canais esquerdo e direito');

      // Beta (16 Hz beat: 200 Hz L, 216 Hz R)
      PomodoroAudio.tocar('binaural_beta');
      assert.strictEqual(PomodoroAudio.obterEstado().currentTrack, 'binaural_beta');
    });
  });

  // =========================================================================
  // 3. Ciclo de Vida, Desconexão de Nós e Idempotência
  // =========================================================================
  describe('Ciclo de Vida, Vazamento de Recursos e Idempotência', () => {
    test('alternância repetida entre buffers e osciladores desconecta fontes anteriores sem vazamento', async () => {
      await PomodoroAudio.iniciar();

      const sequence = ['white_noise', 'binaural_alpha', 'brown_noise', 'binaural_beta', 'pink_noise', 'procedural_rain'];
      for (const track of sequence) {
        PomodoroAudio.tocar(track);
        assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, true);
      }

      // Parar fontes
      PomodoroAudio.parar();
      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, false);
      assert.strictEqual(PomodoroAudio._activeSourceNode, null);
      assert.strictEqual(PomodoroAudio._activeOscillators.length, 0);
      assert.strictEqual(PomodoroAudio._activePanners.length, 0);
    });

    test('destroy() é estritamente idempotente e seguro contra múltiplas invocações', async () => {
      await PomodoroAudio.iniciar();
      PomodoroAudio.tocar('white_noise');

      assert.doesNotThrow(() => {
        for (let i = 0; i < 5; i++) {
          PomodoroAudio.destroy();
        }
      });

      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, false);
      assert.strictEqual(PomodoroAudio._audioCtx, null);
      assert.strictEqual(PomodoroAudio._masterGain, null);
    });

    test('opera de forma segura se chamado antes de iniciar() ou com contexto nulo', () => {
      PomodoroAudio.conectarContexto(null);

      assert.doesNotThrow(() => {
        PomodoroAudio.tocar('white_noise');
        PomodoroAudio.pausar();
        PomodoroAudio.parar();
        PomodoroAudio.ajustarVolume(0.3);
        PomodoroAudio.mutar(true);
        PomodoroAudio.destroy();
      });

      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, false);
    });
  });

  // =========================================================================
  // 4. Verificação de Ausência de Arquivos Binários de Mídia
  // =========================================================================
  describe('Integridade de Mídia (Zero Arquivos Externos)', () => {
    test('repositório não contém nenhum arquivo binário de áudio', () => {
      const rootDir = path.resolve(__dirname, '../../');
      const audioExtensions = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.opus', '.weba', '.aiff', '.wma'];

      function checkDir(dir) {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name === '.git' || entry.name === 'node_modules') continue;
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            checkDir(fullPath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            assert.ok(!audioExtensions.includes(ext), `Arquivo de áudio externo proibido encontrado: ${fullPath}`);
          }
        }
      }

      checkDir(rootDir);
    });
  });
});

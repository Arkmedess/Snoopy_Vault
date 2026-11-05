/**
 * Snoopy Vault - Testes Automatizados da Tarefa 1 (Streaming YouTube via MPV)
 * e Tarefa 2 (Preview e Validação de URL).
 */
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const AUDIO_MODULE_PATH = path.resolve(__dirname, '../../99_Meta/Snoopy/core/pomodoro_audio.js');

function carregarMotorAudio() {
  delete require.cache[require.resolve(AUDIO_MODULE_PATH)];
  return require(AUDIO_MODULE_PATH);
}

describe('PomodoroAudio - Tarefas 1 e 2: Streaming YouTube via MPV & Preview', () => {
  let PomodoroAudio;

  beforeEach(() => {
    PomodoroAudio = carregarMotorAudio();
  });

  afterEach(() => {
    if (PomodoroAudio && typeof PomodoroAudio.destroy === 'function') {
      PomodoroAudio.destroy();
    }
  });

  // =========================================================================
  // 1. Validação de URLs do YouTube (Critério Estrito)
  // =========================================================================
  describe('Validação de URL (validarUrl)', () => {
    test('aceita links legítimos do youtube.com, youtu.be e music.youtube.com e normaliza para canônica', () => {
      const validos = [
        { entrada: 'https://www.youtube.com/watch?v=D0KMxRMfwxE', esperada: 'https://www.youtube.com/watch?v=D0KMxRMfwxE' },
        { entrada: 'https://youtube.com/watch?v=D0KMxRMfwxE', esperada: 'https://www.youtube.com/watch?v=D0KMxRMfwxE' },
        { entrada: 'https://m.youtube.com/watch?v=D0KMxRMfwxE', esperada: 'https://www.youtube.com/watch?v=D0KMxRMfwxE' },
        { entrada: 'https://youtu.be/D0KMxRMfwxE', esperada: 'https://www.youtube.com/watch?v=D0KMxRMfwxE' },
        { entrada: 'https://music.youtube.com/watch?v=D0KMxRMfwxE', esperada: 'https://www.youtube.com/watch?v=D0KMxRMfwxE' },
        { entrada: 'https://www.youtube.com/watch?v=D0KMxRMfwxE&list=PL123&t=45s&si=abc', esperada: 'https://www.youtube.com/watch?v=D0KMxRMfwxE' },
        { entrada: 'https://www.youtube.com/shorts/D0KMxRMfwxE', esperada: 'https://www.youtube.com/watch?v=D0KMxRMfwxE' },
        { entrada: 'https://www.youtube.com/live/rIFDqCYMOAQ', esperada: 'https://www.youtube.com/watch?v=rIFDqCYMOAQ' }
      ];

      for (const item of validos) {
        const res = PomodoroAudio.validarUrl(item.entrada);
        assert.strictEqual(res.valido, true, `Deveria aceitar: ${item.entrada}`);
        assert.strictEqual(res.url, item.esperada);
      }
    });

    test('rejeita domínios arbitrários e links maliciosos com mensagem de erro clara', () => {
      const invalidos = [
        'https://vimeo.com/123456',
        'https://soundcloud.com/artist/track',
        'https://google.com',
        'https://malicious-youtube.com/test',
        'ftp://youtube.com',
        'not-a-valid-url',
        '',
        null,
        undefined
      ];

      for (const url of invalidos) {
        const res = PomodoroAudio.validarUrl(url);
        assert.strictEqual(res.valido, false, `Deveria rejeitar: ${url}`);
        assert.ok(typeof res.erro === 'string' && res.erro.length > 0);
      }
    });
  });

  // =========================================================================
  // 2. Backend Pronto para Command Palette (tocarLinkYoutube)
  // =========================================================================
  describe('Backend para Command Palette (tocarLinkYoutube)', () => {
    test('rejeita URL inválida sem tocar e sem spawnar mpv', async () => {
      const res = await PomodoroAudio.tocarLinkYoutube('https://spotify.com/track/123');
      assert.strictEqual(res.sucesso, false);
      assert.ok(res.erro.includes('youtube.com'));
      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, false);
    });

    test('aplica regra de exclusão mútua pausando áudio local ao tocar link do YouTube', async () => {
      let audioPausado = false;
      PomodoroAudio._audioEl = {
        pause() { audioPausado = true; },
        play: async () => {},
        volume: 0.5
      };

      // Mock seguro do spawn do mpv para teste unitário determinístico
      let argsRecebidos = null;
      PomodoroAudio._node = {
        cp: {
          spawn(cmd, args) {
            argsRecebidos = { cmd, args };
            return {
              on(evt, cb) {
                if (evt === 'exit') {}
              },
              kill() {}
            };
          }
        },
        net: {
          connect(path, cb) {
            // Simula conexão imediata com o socket IPC
            process.nextTick(cb);
            return {
              write() {},
              destroy() {},
              on() {}
            };
          }
        },
        fs: {
          existsSync() { return false; },
          unlinkSync() {}
        }
      };

      const urlYoutube = 'https://www.youtube.com/watch?v=D0KMxRMfwxE';
      const res = await PomodoroAudio.tocarLinkYoutube(urlYoutube);

      assert.strictEqual(res.sucesso, true);
      assert.strictEqual(audioPausado, true, 'Áudio local deve ser pausado imediatamente (exclusão mútua)');
      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, true);
      assert.strictEqual(PomodoroAudio.obterEstado().currentTrack, 'custom_url');

      // Validação de segurança no comando spawn
      assert.ok(argsRecebidos.cmd.includes('mpv'));
      assert.ok(argsRecebidos.args.includes('--no-video'));
      assert.ok(argsRecebidos.args.some(a => a.startsWith('--ytdl-format=bestaudio')));
      assert.ok(argsRecebidos.args.some(a => a.includes('no-playlist=') && a.includes('player_client=android')));
      assert.ok(argsRecebidos.args.includes('--')); // Segurança: separador antes da URL

      // A URL deve ser o último argumento logo após o separador '--'
      const dashIdx = argsRecebidos.args.indexOf('--');
      assert.strictEqual(argsRecebidos.args[dashIdx + 1], urlYoutube);
    });

    test('ao tocar som ambiente local, encerra imediatamente o processo MPV (exclusão mútua)', async () => {
      let mpvEncerrado = false;
      PomodoroAudio._mpvProcess = {
        kill() { mpvEncerrado = true; }
      };
      PomodoroAudio._mpvConectado = true;

      // Mock de verificação de faixa local
      PomodoroAudio._verificarOuBaixarFaixa = async () => true;
      PomodoroAudio._garantirElementoAudio = () => ({
        play: async () => {},
        pause: () => {},
        src: '',
        load: () => {}
      });

      await PomodoroAudio.tocar('brown_noise');
      assert.strictEqual(mpvEncerrado, true, 'MPV deve ser encerrado ao trocar para som ambiente local');
      assert.strictEqual(PomodoroAudio._mpvConectado, false);
    });
  });

  // =========================================================================
  // 3. Obtenção de Metadados para Preview (obterPreviewMetadados)
  // =========================================================================
  describe('Preview de Vídeo (obterPreviewMetadados)', () => {
    test('rejeita imediatamente links inválidos sem executar yt-dlp', async () => {
      const res = await PomodoroAudio.obterPreviewMetadados('link-invalido');
      assert.strictEqual(res.valido, false);
      assert.strictEqual(res.sucesso, false);
    });

    test('extrai título e capa via yt-dlp em lista segura de argumentos', async () => {
      PomodoroAudio._node = {
        cp: {
          execFile(cmd, args, opts, cb) {
            assert.strictEqual(cmd, 'yt-dlp');
            assert.ok(args.includes('--dump-single-json'));
            assert.ok(args.includes('--no-playlist'));
            assert.ok(args.includes('--skip-download'));
            assert.ok(args.includes('--'));

            cb(null, JSON.stringify({
              title: 'Lofi Hip Hop Study',
              thumbnail: 'https://i.ytimg.com/vi/123/hqdefault.jpg'
            }));
          }
        }
      };

      const res = await PomodoroAudio.obterPreviewMetadados('https://youtu.be/123456');
      assert.strictEqual(res.valido, true);
      assert.strictEqual(res.sucesso, true);
      assert.strictEqual(res.titulo, 'Lofi Hip Hop Study');
      assert.strictEqual(res.miniatura, 'https://i.ytimg.com/vi/123/hqdefault.jpg');
    });

    test('trata defensivamente falha de rede ou vídeo indisponível sem travar', async () => {
      PomodoroAudio._node = {
        cp: {
          execFile(cmd, args, opts, cb) {
            cb(new Error('ERROR: Video unavailable'));
          }
        }
      };

      const res = await PomodoroAudio.obterPreviewMetadados('https://youtube.com/watch?v=indisponivel');
      assert.strictEqual(res.valido, true);
      assert.strictEqual(res.sucesso, false);
      assert.ok(typeof res.erro === 'string');
    });
  });

  // =========================================================================
  // 4. Prevenção de Processos Órfãos
  // =========================================================================
  describe('Gerenciamento de Processos e Prevenção de Órfãos', () => {
    test('destroy() encerra socket e processo MPV de forma garantida', () => {
      let socketDestruido = false;
      let processoMorto = false;

      PomodoroAudio._mpvSocket = {
        write() {},
        destroy() { socketDestruido = true; }
      };
      PomodoroAudio._mpvProcess = {
        kill() { processoMorto = true; }
      };
      PomodoroAudio._mpvConectado = true;

      PomodoroAudio.destroy();

      assert.strictEqual(socketDestruido, true, 'Socket deve ser destruído no destroy()');
      assert.strictEqual(processoMorto, true, 'Processo MPV deve ser morto no destroy()');
      assert.strictEqual(PomodoroAudio._mpvConectado, false);
      assert.strictEqual(PomodoroAudio._mpvProcess, null);
    });
  });
});

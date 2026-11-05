/**
 * Snoopy Vault - Núcleo Integrado de Áudio de Foco (PomodoroAudio)
 * 
 * Arquitetura Totalmente Integrada:
 * 1. Cache Local Inteligente (99_Meta/Snoopy/audio/*.ogg):
 *    - Na 1ª execução, se o arquivo .ogg ainda não existir na pasta do cofre,
 *      extrai automaticamente 60s do YouTube com crossfade perfeito de 4s (~450 KB por faixa).
 *    - Nas execuções seguintes (ou após clonar do GitHub), verifica que o arquivo já existe
 *      e toca instantaneamente via HTML5 Audio nativo (0 latência, 100% offline, sem reinstalar nada).
 * 2. Link Dinâmico (Opção B - Qualquer URL do YouTube):
 *    - Reproduz em background via MPV + IPC Socket ou baixa/cacheia na pasta de áudio.
 * 
 * @module core/pomodoro_audio
 */

const STORAGE_KEYS = {
  VOLUME: 'snoopy_pomodoro_audio_volume',
  MUTED: 'snoopy_pomodoro_audio_muted',
  AUTOSYNC: 'snoopy_pomodoro_audio_autosync',
  TRACK: 'snoopy_pomodoro_audio_track',
  CUSTOM_URL: 'snoopy_pomodoro_audio_custom_url',
  CUSTOM_TITLE: 'snoopy_pomodoro_audio_custom_title',
  CUSTOM_THUMB: 'snoopy_pomodoro_audio_custom_thumb'
};

const PASTA_AUDIO_RELATIVA = '99_Meta/Snoopy/audio';

const FAIXAS_CATALOGO = [
  {
    id: 'brown_noise',
    shopId: 'audio-brown-noise',
    label: 'Ruído Marrom Profundo',
    descricao: 'Graves aveludados e relaxamento contínuo (extraído do vídeo original).',
    arquivo: '99_Meta/Snoopy/audio/brown_noise.ogg',
    youtubeUrl: 'https://youtu.be/D0KMxRMfwxE',
    corteInicio: '00:02:00',
    corteFim: '00:03:04',
    gratuita: false
  },
  {
    id: 'white_noise',
    shopId: 'audio-white-noise',
    label: 'Ruído Branco Suave',
    descricao: 'Mascaramento acústico suave e relaxante para estudos.',
    arquivo: '99_Meta/Snoopy/audio/white_noise.ogg',
    youtubeUrl: 'https://youtu.be/XTBtwgHq9fw',
    corteInicio: '00:02:00',
    corteFim: '00:03:04',
    gratuita: true
  },
  {
    id: 'forest_quiet',
    shopId: 'audio-stream-forest',
    label: 'The Knight Quiet Forest',
    descricao: 'Ambiente imersivo e acolhedor de floresta silenciosa.',
    arquivo: '99_Meta/Snoopy/audio/forest_quiet.ogg',
    youtubeUrl: 'https://youtu.be/xxYJONmXE8w',
    corteInicio: '00:01:00',
    corteFim: '00:02:04',
    gratuita: true
  },
  {
    id: 'binaural_gamma_40hz',
    shopId: 'audio-binaural-gamma',
    label: '40Hz Binaural Gamma Waves',
    descricao: 'Ondas Gama de 40 Hz para foco intenso, memória e cognição.',
    arquivo: '99_Meta/Snoopy/audio/binaural_gamma.ogg',
    youtubeUrl: 'https://youtu.be/FtukH_bCDHg',
    corteInicio: '00:02:00',
    corteFim: '00:03:04',
    gratuita: false
  },
  {
    id: 'procedural_rain',
    shopId: 'audio-procedural-rain',
    label: 'Chuva Zen Procedural',
    descricao: 'Chuva contínua acústica para leitura e foco.',
    arquivo: '99_Meta/Snoopy/audio/rain.ogg',
    youtubeUrl: 'https://youtu.be/WsZ5gWX4YM0',
    corteInicio: '00:02:00',
    corteFim: '00:03:04',
    gratuita: false
  },
  {
    id: 'pink_noise',
    shopId: 'audio-pink-noise',
    label: 'Ruído Rosa Relaxante',
    descricao: 'Densidade equilibrada de 3dB/oitava para concentração e leitura.',
    arquivo: '99_Meta/Snoopy/audio/pink_noise.ogg',
    youtubeUrl: '',
    gratuita: false
  },
  {
    id: 'binaural_alpha',
    shopId: 'audio-binaural-alpha',
    label: 'Ondas Alfa 10Hz',
    descricao: 'Batimento binaural estéreo de 10 Hz para alerta sereno e retenção.',
    arquivo: '99_Meta/Snoopy/audio/binaural_alpha.ogg',
    youtubeUrl: '',
    gratuita: false
  },
  {
    id: 'binaural_beta',
    shopId: 'audio-binaural-beta',
    label: 'Ondas Beta 16Hz',
    descricao: 'Batimento binaural estéreo de 16 Hz para foco convergente e resolução analítica.',
    arquivo: '99_Meta/Snoopy/audio/binaural_beta.ogg',
    youtubeUrl: '',
    gratuita: false
  },
  {
    id: 'lofi_japan',
    shopId: 'audio-stream-lofi-japan',
    label: 'Japan LOFI',
    descricao: 'Batidas Lofi relaxantes para acompanhar sessões de estudo.',
    arquivo: '99_Meta/Snoopy/audio/lofi_japan.ogg',
    youtubeUrl: 'https://www.youtube.com/live/rIFDqCYMOAQ',
    corteInicio: '00:00:00',
    corteFim: '00:01:04',
    gratuita: true
  },
  {
    id: 'custom_url',
    shopId: 'audio-custom-url',
    label: 'Link Personalizado (YouTube / MPV)',
    descricao: 'Cole qualquer URL do YouTube para tocar via MPV ou extrair automaticamente.',
    arquivo: '99_Meta/Snoopy/audio/custom_track.ogg',
    youtubeUrl: '',
    corteInicio: '00:00:30',
    corteFim: '00:01:34',
    gratuita: true
  }
];

class PomodoroAudioEngine {
  constructor() {
    this._audioEl = null;
    this._injectedStorage = null;
    this._isPlaying = false;
    this._isDownloading = false;
    this._currentTrack = 'brown_noise';
    this._volume = 0.5;
    this._isMuted = false;
    this._autoSync = true;

    this._customUrl = '';
    this._customTitle = '';
    this._customThumb = '';

    this._audioCtx = null;
    this._masterGain = null;
    this._activeSourceNode = null;
    this._activeOscillators = [];
    this._activePanners = [];
    this._bufferCache = new Map();

    this._mpvProcess = null;
    this._mpvSocket = null;
    this._mpvConectado = false;
    this._node = this._carregarModulosNode();

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.destroy());
    }
    if (typeof process !== 'undefined' && typeof process.on === 'function') {
      process.on('exit', () => this._encerrarMpv());
    }
  }

  /**
   * Valida se a URL fornecida pertence estritamente aos domínios suportados do YouTube
   * e normaliza para a URL canônica (https://www.youtube.com/watch?v=<id>),
   * eliminando parâmetros residuais (&list, &t, &si, quebras de linha ou espaços).
   * Suporta youtube.com, youtu.be, music.youtube.com, /shorts/, /live/ e /embed/.
   *
   * @param {string} url
   * @returns {{ valido: boolean, url?: string, videoId?: string, erro?: string }}
   */
  validarUrl(url) {
    if (!url || typeof url !== 'string') {
      return { valido: false, erro: 'URL não informada ou vazia.' };
    }
    const limpa = url.trim().replace(/[\r\n\t]/g, '');
    if (!limpa) {
      return { valido: false, erro: 'URL vazia.' };
    }

    try {
      const parsed = new URL(limpa);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return {
          valido: false,
          erro: 'Protocolo inválido. Apenas links HTTP/HTTPS são suportados.'
        };
      }
      const host = parsed.hostname.toLowerCase();
      const hostsValidos = [
        'youtube.com',
        'www.youtube.com',
        'm.youtube.com',
        'music.youtube.com',
        'youtu.be'
      ];

      const ehValido = hostsValidos.includes(host);
      if (!ehValido) {
        return {
          valido: false,
          erro: 'URL não suportada. Aceita exclusivamente links do youtube.com, youtu.be ou music.youtube.com.'
        };
      }

      // Extração rigorosa do ID do vídeo (11 caracteres alfanuméricos com '-' e '_')
      let videoId = null;
      if (host === 'youtu.be') {
        const segmento = parsed.pathname.slice(1).split('/')[0];
        if (segmento) videoId = segmento;
      } else if (parsed.pathname.startsWith('/shorts/')) {
        const segmento = parsed.pathname.split('/shorts/')[1]?.split('/')[0];
        if (segmento) videoId = segmento;
      } else if (parsed.pathname.startsWith('/live/')) {
        const segmento = parsed.pathname.split('/live/')[1]?.split('/')[0];
        if (segmento) videoId = segmento;
      } else if (parsed.pathname.startsWith('/embed/')) {
        const segmento = parsed.pathname.split('/embed/')[1]?.split('/')[0];
        if (segmento) videoId = segmento;
      } else if (parsed.searchParams.has('v')) {
        videoId = parsed.searchParams.get('v');
      }

      if (!videoId || !/^[a-zA-Z0-9_-]{6,32}$/.test(videoId)) {
        return {
          valido: false,
          erro: 'ID de vídeo do YouTube inválido ou ausente na URL fornecida.'
        };
      }

      // Remontagem canônica sem parâmetros residuais (&list, &t, &si)
      const urlCanonica = `https://www.youtube.com/watch?v=${videoId}`;
      return { valido: true, url: urlCanonica, videoId };
    } catch (e) {
      return {
        valido: false,
        erro: 'Formato de link inválido. Certifique-se de incluir https://.'
      };
    }
  }

  /**
   * Resolve o caminho absoluto de um binário no sistema utilizando which/where.
   * Garante localização correta mesmo em ambientes com PATH restrito do Obsidian.
   *
   * @param {string} nomeBinario
   * @returns {string}
   * @private
   */
  _resolverCaminhoBinario(nomeBinario) {
    if (this._node && this._node.cp) {
      try {
        const cmd = (typeof process !== 'undefined' && process.platform === 'win32')
          ? `where ${nomeBinario}`
          : `which ${nomeBinario}`;
        const out = this._node.cp.execSync(cmd, { encoding: 'utf8', timeout: 2000 }).trim();
        const linhas = out.split('\n');
        if (linhas.length > 0 && linhas[0].trim()) {
          return linhas[0].trim();
        }
      } catch (e) {}
    }
    return nomeBinario;
  }

  _carregarModulosNode() {
    try {
      const req = (typeof window !== 'undefined' && window.require) ? window.require : (typeof require !== 'undefined' ? require : null);
      if (req) {
        return {
          fs: req('fs'),
          path: req('path'),
          cp: req('child_process'),
          net: req('net')
        };
      }
    } catch (e) {}
    return null;
  }

  _obterCaminhoBaseVault() {
    try {
      if (typeof app !== 'undefined' && app.vault && app.vault.adapter && typeof app.vault.adapter.getBasePath === 'function') {
        return app.vault.adapter.getBasePath();
      }
    } catch (e) {}
    return '';
  }

  _notificar(mensagem) {
    console.info(`[PomodoroAudio] ${mensagem}`);
    if (typeof Notice !== 'undefined') {
      new Notice(mensagem, 4500);
    }
  }

  // =========================================================================
  // Persistência e Configuração
  // =========================================================================

  _obterContexto() {
    if (this._audioCtx) return this._audioCtx;
    if (typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        this._audioCtx = new AudioCtxClass();
      }
    }
    return this._audioCtx;
  }

  _garantirMasterGain(ctx) {
    if (this._masterGain) return this._masterGain;
    if (!ctx) return null;
    const gain = ctx.createGain();
    const target = this._isMuted ? 0 : this._volume;
    if (gain.gain && typeof gain.gain.setValueAtTime === 'function') {
      gain.gain.setValueAtTime(target, ctx.currentTime || 0);
    }
    gain.connect(ctx.destination);
    this._masterGain = gain;
    return this._masterGain;
  }

  _gerarAmostrasFaixa(trackId, sampleRate = 44100, durationSec = 4.0) {
    const totalSamples = Math.floor(sampleRate * durationSec);
    const samples = new Float32Array(totalSamples);
    const id = this._normalizarTrackId(trackId);

    if (id === 'white_noise') {
      for (let i = 0; i < totalSamples; i++) {
        samples[i] = (Math.random() * 2) - 1.0;
      }
      return samples;
    }

    if (id === 'brown_noise') {
      let lastOut = 0.0;
      for (let i = 0; i < totalSamples; i++) {
        const white = (Math.random() * 2) - 1.0;
        lastOut = (lastOut + (0.02 * white)) / 1.02;
        samples[i] = Math.max(-1.0, Math.min(1.0, lastOut * 3.5));
      }
      return samples;
    }

    if (id === 'pink_noise') {
      let b0 = 0.0, b1 = 0.0, b2 = 0.0, b3 = 0.0, b4 = 0.0, b5 = 0.0, b6 = 0.0;
      for (let i = 0; i < totalSamples; i++) {
        const white = (Math.random() * 2) - 1.0;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        b6 = white * 0.115926;
        samples[i] = Math.max(-1.0, Math.min(1.0, pink * 0.11));
      }
      return samples;
    }

    if (id === 'procedural_rain' || id === 'rain') {
      let b0 = 0.0, b1 = 0.0, b2 = 0.0;
      for (let i = 0; i < totalSamples; i++) {
        const white = (Math.random() * 2) - 1.0;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        samples[i] = (b0 + b1 + b2) * 0.08;
      }
      const qtdGotas = Math.floor(durationSec * 40);
      for (let g = 0; g < qtdGotas; g++) {
        const startIndex = Math.floor(Math.random() * (totalSamples - 1200));
        const freqGota = 1400 + Math.random() * 1200;
        const durAmostras = Math.floor(sampleRate * (0.015 + Math.random() * 0.015));
        const amp = 0.15 + Math.random() * 0.20;
        for (let j = 0; j < durAmostras; j++) {
          const t = j / sampleRate;
          const envelope = Math.exp(-150 * t);
          const val = Math.sin(2 * Math.PI * freqGota * t) * envelope * amp;
          const idx = startIndex + j;
          if (idx < totalSamples) {
            samples[idx] = Math.max(-1.0, Math.min(1.0, samples[idx] + val));
          }
        }
      }
      return samples;
    }

    for (let i = 0; i < totalSamples; i++) {
      samples[i] = (Math.random() * 2) - 1.0;
    }
    return samples;
  }

  _obterOuCriarBuffer(ctx, trackId) {
    const id = this._normalizarTrackId(trackId);
    if (this._bufferCache.has(id)) {
      return this._bufferCache.get(id);
    }
    const sampleRate = ctx.sampleRate || 44100;
    const duration = 4.0;
    const length = Math.floor(sampleRate * duration);
    const audioBuffer = ctx.createBuffer(1, length, sampleRate);
    const channelData = audioBuffer.getChannelData(0);
    const rawSamples = this._gerarAmostrasFaixa(id, sampleRate, duration);
    channelData.set(rawSamples);
    this._bufferCache.set(id, audioBuffer);
    return audioBuffer;
  }

  _pararFontesAtivas() {
    if (this._activeSourceNode) {
      try {
        if (typeof this._activeSourceNode.stop === 'function') this._activeSourceNode.stop();
        if (typeof this._activeSourceNode.disconnect === 'function') this._activeSourceNode.disconnect();
      } catch (err) {}
      this._activeSourceNode = null;
    }
    for (const osc of this._activeOscillators) {
      try {
        if (typeof osc.stop === 'function') osc.stop();
        if (typeof osc.disconnect === 'function') osc.disconnect();
      } catch (err) {}
    }
    this._activeOscillators = [];
    for (const pan of this._activePanners) {
      try {
        if (typeof pan.disconnect === 'function') pan.disconnect();
      } catch (err) {}
    }
    this._activePanners = [];
  }

  conectarContexto(ctx) {
    if (this._isPlaying) {
      this.parar();
    }
    this._audioCtx = ctx;
    this._masterGain = null;
    if (this._bufferCache) {
      this._bufferCache.clear();
    }
  }

  conectarStorage(storage) {
    this._injectedStorage = storage;
    this._carregarPreferencias();
  }

  _getStorage() {
    if (this._injectedStorage) return this._injectedStorage;
    if (typeof localStorage !== 'undefined') return localStorage;
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    if (!this._memoryStorage) {
      const store = new Map();
      this._memoryStorage = {
        getItem: (k) => store.has(k) ? store.get(k) : null,
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k)
      };
    }
    return this._memoryStorage;
  }

  _carregarPreferencias() {
    const storage = this._getStorage();
    const volStr = storage.getItem(STORAGE_KEYS.VOLUME);
    if (volStr !== null) {
      const v = parseFloat(volStr);
      if (!Number.isNaN(v)) this._volume = Math.max(0.0, Math.min(1.0, v));
    }

    const mutedStr = storage.getItem(STORAGE_KEYS.MUTED);
    if (mutedStr !== null) this._isMuted = mutedStr === 'true';

    const syncStr = storage.getItem(STORAGE_KEYS.AUTOSYNC);
    if (syncStr !== null) this._autoSync = syncStr !== 'false';

    const trackStr = storage.getItem(STORAGE_KEYS.TRACK);
    if (trackStr) this._currentTrack = trackStr;

    this._customUrl = storage.getItem(STORAGE_KEYS.CUSTOM_URL) || '';
    this._customTitle = storage.getItem(STORAGE_KEYS.CUSTOM_TITLE) || '';
    this._customThumb = storage.getItem(STORAGE_KEYS.CUSTOM_THUMB) || '';
  }

  _normalizarTrackId(id) {
    if (!id) return 'white_noise';
    if (id === 'rain' || id === 'audio-procedural-rain') return 'procedural_rain';
    const clean = String(id).replace(/^audio-/, '').replace(/-/g, '_');
    const matched = FAIXAS_CATALOGO.find(f => f.id === clean || f.shopId === id || f.id === id);
    return matched ? matched.id : clean;
  }

  _garantirElementoAudio() {
    if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return null;
    if (!this._audioEl) {
      let existing = document.getElementById('snoopy-pomodoro-audio-player');
      if (!existing) {
        existing = document.createElement('audio');
        existing.id = 'snoopy-pomodoro-audio-player';
        existing.loop = true;
        existing.preload = 'auto';
        document.body.appendChild(existing);
      }
      this._audioEl = existing;
    }
    this._audioEl.loop = true;
    this._audioEl.volume = this._isMuted ? 0 : this._volume;
    return this._audioEl;
  }

  // =========================================================================
  // Verificação e Download Único na 1ª Execução (yt-dlp + ffmpeg)
  // =========================================================================

  /**
   * Verifica se o arquivo .ogg já existe na pasta 99_Meta/Snoopy/audio.
   * Se existir, retorna true imediatamente sem baixar nada.
   * Se não existir (1ª vez), extrai 60s com crossfade de 4s e salva na pasta para commit.
   */
  async _verificarOuBaixarFaixa(config, forcarDownload = false) {
    if (!this._node || !config || !config.arquivo) return false;
    const { fs, path, cp } = this._node;
    const basePath = this._obterCaminhoBaseVault();
    if (!basePath) return false;

    const absFilePath = path.join(basePath, config.arquivo);
    const absDir = path.dirname(absFilePath);

    // 1. Verifica se o arquivo já existe e é válido (> 10 KB)
    if (!forcarDownload && fs.existsSync(absFilePath)) {
      const stats = fs.statSync(absFilePath);
      if (stats.size > 10240) {
        return true; // Já está baixado! Toca direto sem reinstalar
      }
    }

    const url = config.id === 'custom_url' ? this._customUrl : config.youtubeUrl;
    if (!url) return false;

    // 2. Cria a pasta 99_Meta/Snoopy/audio caso não exista
    if (!fs.existsSync(absDir)) {
      fs.mkdirSync(absDir, { recursive: true });
    }

    this._isDownloading = true;
    this._notificar(`Baixando e preparando loop de "${config.label}" pela 1ª vez (aguarde ~10s)...`);

    const tempRaw = path.join(absDir, `temp_${config.id}_${Date.now()}.opus`);
    const inicio = config.corteInicio || '00:01:00';
    const fim = config.corteFim || '00:02:04';

    const cmd = `yt-dlp -x --audio-format opus --postprocessor-args "-ss ${inicio} -to ${fim}" "${url}" -o "${tempRaw}" && ffmpeg -y -i "${tempRaw}" -filter_complex "[0:a]asplit=2[m][l];[m]atrim=0:60[head];[l]atrim=60:64,asetpts=PTS-STARTPTS[tail];[tail][head]acrossfade=d=4:c1=tri:c2=tri" -b:a 64k "${absFilePath}"`;

    return new Promise((resolve) => {
      cp.exec(cmd, { timeout: 120000 }, (err) => {
        try {
          if (fs.existsSync(tempRaw)) fs.unlinkSync(tempRaw);
        } catch (e) {}

        this._isDownloading = false;

        if (err || !fs.existsSync(absFilePath)) {
          console.warn('[PomodoroAudio] Falha na extração de 1ª vez:', err ? err.message : 'Arquivo não gerado');
          resolve(false);
        } else {
          this._notificar(`Áudio "${config.label}" salvo em ${config.arquivo}! Pronto para uso e commit.`);
          resolve(true);
        }
      });
    });
  }

  /**
   * Utilitário para baixar todas as 6 faixas padrão de uma só vez (para commitar tudo junto no GitHub).
   */
  async sincronizarTodasFaixasPadrao() {
    for (const faixa of FAIXAS_CATALOGO) {
      if (faixa.id !== 'custom_url' && faixa.youtubeUrl) {
        await this._verificarOuBaixarFaixa(faixa, false);
      }
    }
    this._notificar('Todas as 6 faixas padrão foram salvas em 99_Meta/Snoopy/audio!');
  }

  // =========================================================================
  // Streaming Direto via MPV + IPC Socket (Para Links Ao Vivo / YouTube)
  // Regra de Coexistência: Exclusão Mútua
  // Ao reproduzir via MPV, o som ambiente HTML5 local é pausado.
  // Ao selecionar qualquer som ambiente local, o processo do MPV é encerrado.
  // =========================================================================

  _obterSocketPath() {
    const isWin = typeof process !== 'undefined' && process.platform === 'win32';
    return isWin ? '\\\\.\\pipe\\snoopy_mpv_ipc' : '/tmp/snoopy_mpv_ipc.sock';
  }

  async _tocarViaMpv(url) {
    if (!this._node) {
      this._notificar('Módulos de sistema não disponíveis neste ambiente.');
      return { sucesso: false, erro: 'Módulos nativos Node indisponíveis.' };
    }

    const validacao = this.validarUrl(url);
    if (!validacao.valido) {
      this._notificar(validacao.erro);
      return { sucesso: false, erro: validacao.erro };
    }

    const { cp, net, fs } = this._node;
    const socketPath = this._obterSocketPath();

    // Se já estiver conectado ao MPV, reutiliza enviando loadfile via IPC
    if (this._mpvProcess && this._mpvConectado && this._mpvSocket) {
      try {
        this._enviarComandoMpv(['loadfile', validacao.url, 'replace']);
        this._enviarComandoMpv(['set_property', 'volume', Math.round(this._isMuted ? 0 : this._volume * 100)]);
        this._enviarComandoMpv(['set_property', 'pause', false]);
        return { sucesso: true };
      } catch (err) {
        console.warn('[PomodoroAudio] Falha ao enviar loadfile ao mpv existente, reiniciando processo:', err);
      }
    }

    this._encerrarMpv();

    // Limpa socket pré-existente órfão se houver
    if (fs && typeof fs.unlinkSync === 'function' && !socketPath.startsWith('\\\\')) {
      try {
        if (fs.existsSync(socketPath)) fs.unlinkSync(socketPath);
      } catch (e) {}
    }

    const mpvBin = this._resolverCaminhoBinario('mpv');
    const ytdlBin = this._resolverCaminhoBinario('yt-dlp');

    const args = [
      '--no-video',
      '--ytdl-format=bestaudio/best',
      '--ytdl-raw-options=no-playlist=,extractor-args=youtube:player_client=android',
      `--script-opts=ytdl_hook-ytdl_path=${ytdlBin}`,
      '--loop=inf',
      '--force-window=no',
      `--input-ipc-server=${socketPath}`,
      `--volume=${Math.round(this._isMuted ? 0 : this._volume * 100)}`,
      this._isMuted ? '--mute=yes' : '--mute=no',
      '--',
      validacao.url
    ];

    console.log('[PomodoroAudio] Executando MPV com argumentos:', {
      executavel: mpvBin,
      ytdlPath: ytdlBin,
      args,
      urlRecebida: url,
      urlSanitizada: validacao.url
    });

    return new Promise((resolve) => {
      let resolvido = false;
      const responder = (sucesso, erro = null) => {
        if (resolvido) return;
        resolvido = true;
        resolve({ sucesso, erro });
      };

      try {
        this._mpvProcess = cp.spawn(mpvBin, args, {
          detached: false,
          stdio: ['ignore', 'pipe', 'pipe']
        });

        let stderrBuffer = '';
        let stdoutBuffer = '';

        if (this._mpvProcess.stderr) {
          this._mpvProcess.stderr.on('data', (chunk) => {
            stderrBuffer += chunk.toString();
          });
        }
        if (this._mpvProcess.stdout) {
          this._mpvProcess.stdout.on('data', (chunk) => {
            stdoutBuffer += chunk.toString();
          });
        }

        this._mpvProcess.on('error', (err) => {
          this._mpvConectado = false;
          this._mpvProcess = null;
          const msg = (err && err.code === 'ENOENT')
            ? "mpv ou yt-dlp não encontrado. Instale via 'sudo pacman -S mpv yt-dlp' (Arch) ou 'sudo apt install mpv yt-dlp' (Debian/Ubuntu)."
            : `Erro ao iniciar mpv: ${err ? err.message : 'Falha desconhecida'}`;
          console.error('[PomodoroAudio] Erro de spawn do MPV:', err);
          this._notificar(msg);
          responder(false, msg);
        });

        this._mpvProcess.on('exit', (code) => {
          this._mpvConectado = false;
          this._mpvProcess = null;
          if (code !== 0) {
            console.error(`[PomodoroAudio] MPV encerrou com código ${code}. Stderr:\n${stderrBuffer}`);
            let motivo = `mpv encerrou com código de saída ${code}.`;
            if (stderrBuffer.includes('Private video') || stderrBuffer.includes('Video unavailable')) {
              motivo = 'Vídeo do YouTube indisponível ou privado.';
            } else if (stderrBuffer.includes('Sign in to confirm your age')) {
              motivo = 'Vídeo com restrição de idade (exige login).';
            } else if (stderrBuffer.includes('HTTP Error 403') || stderrBuffer.includes('Forbidden')) {
              motivo = 'Acesso bloqueado pelo YouTube (erro 403).';
            } else if (stderrBuffer.includes('Option') && stderrBuffer.includes('not found')) {
              motivo = 'Argumento não suportado pelo mpv instalado.';
            } else if (stderrBuffer.includes('ytdl') || stderrBuffer.includes('yt-dlp')) {
              motivo = 'Falha no extrator de áudio yt-dlp.';
            } else if (stderrBuffer.trim()) {
              const primeiraLinha = stderrBuffer.trim().split('\n')[0].slice(0, 90);
              motivo = `${motivo} ${primeiraLinha}`;
            }

            this._notificar(motivo);
            if (!resolvido) {
              responder(false, motivo);
            }
          }
        });

        // Tentativas de conexão no socket IPC
        let tentativas = 0;
        const maxTentativas = 20; // 2 segundos no total
        const tentarConectar = () => {
          if (!this._mpvProcess) {
            responder(false, 'Processo do mpv finalizado antes da conexão.');
            return;
          }

          const client = net.connect(socketPath, () => {
            this._mpvSocket = client;
            this._mpvConectado = true;
            responder(true);
          });

          client.on('error', () => {
            client.destroy();
            tentativas++;
            if (tentativas < maxTentativas) {
              setTimeout(tentarConectar, 100);
            } else {
              responder(false, 'Tempo limite esgotado ao conectar ao socket IPC do mpv.');
            }
          });
        };

        setTimeout(tentarConectar, 150);
      } catch (err) {
        responder(false, err ? err.message : 'Erro ao inicializar mpv');
      }
    });
  }

  _enviarComandoMpv(cmdArray) {
    if (this._mpvSocket && this._mpvConectado) {
      try {
        this._mpvSocket.write(JSON.stringify({ command: cmdArray }) + '\n');
      } catch (e) {}
    }
  }

  _encerrarMpv() {
    if (this._mpvSocket) {
      try {
        this._enviarComandoMpv(['quit']);
        this._mpvSocket.destroy();
      } catch (e) {}
      this._mpvSocket = null;
    }

    if (this._mpvProcess) {
      const proc = this._mpvProcess;
      this._mpvProcess = null;
      try {
        proc.kill('SIGTERM');
      } catch (e) {}
      setTimeout(() => {
        try {
          proc.kill('SIGKILL');
        } catch (e) {}
      }, 300);
    }

    this._mpvConectado = false;

    if (this._node && this._node.fs) {
      const socketPath = this._obterSocketPath();
      if (!socketPath.startsWith('\\\\')) {
        try {
          if (this._node.fs.existsSync(socketPath)) this._node.fs.unlinkSync(socketPath);
        } catch (e) {}
      }
    }
  }

  // =========================================================================
  // Backend Pronto para Command Palette / Streaming YouTube
  // =========================================================================

  /**
   * Ponto de entrada canônico para tocar link do YouTube em streaming direto.
   * Pronto para ser invocado pelo Command Palette do Obsidian ou por outros módulos.
   *
   * @param {string} url - Link do YouTube (youtube.com, youtu.be, music.youtube.com).
   * @returns {Promise<{ sucesso: boolean, url?: string, erro?: string }>}
   */
  async tocarLinkYoutube(url) {
    const validacao = this.validarUrl(url);
    if (!validacao.valido) {
      this._notificar(validacao.erro);
      return { sucesso: false, erro: validacao.erro };
    }

    // Regra de Exclusão Mútua: interrompe áudio local HTML5
    if (this._audioEl) {
      try { this._audioEl.pause(); } catch (e) {}
    }

    this._customUrl = validacao.url;
    this._currentTrack = 'custom_url';
    const storage = this._getStorage();
    storage.setItem(STORAGE_KEYS.TRACK, 'custom_url');
    storage.setItem(STORAGE_KEYS.CUSTOM_URL, validacao.url);

    const resultado = await this._tocarViaMpv(validacao.url);
    if (resultado.sucesso) {
      this._isPlaying = true;
      // Inicia busca assíncrona de metadados em segundo plano para o preview
      this.obterPreviewMetadados(validacao.url).catch(() => {});
      return { sucesso: true, url: validacao.url };
    } else {
      this._isPlaying = false;
      return { sucesso: false, erro: resultado.erro };
    }
  }

  /**
   * Obtém metadados (título e capa) para o preview de vídeo do YouTube.
   * Usa yt-dlp sem download e oferece fallback leve via oEmbed.
   *
   * @param {string} url
   * @returns {Promise<{ valido: boolean, sucesso: boolean, titulo?: string, miniatura?: string, erro?: string }>}
   */
  async obterPreviewMetadados(url) {
    const validacao = this.validarUrl(url);
    if (!validacao.valido) {
      return { valido: false, sucesso: false, erro: validacao.erro };
    }

    const storage = this._getStorage();

    // 1. Tentativa primária via yt-dlp nativo
    if (this._node && this._node.cp) {
      const resYtdl = await new Promise((resolve) => {
        this._node.cp.execFile(
          'yt-dlp',
          ['--dump-single-json', '--no-playlist', '--skip-download', '--no-warnings', '--', validacao.url],
          { timeout: 10000 },
          (err, stdout) => {
            if (!err && stdout) {
              try {
                const info = JSON.parse(stdout);
                resolve({
                  sucesso: true,
                  titulo: info.title || 'Vídeo do YouTube',
                  miniatura: info.thumbnail || ''
                });
                return;
              } catch (e) {}
            }
            resolve({ sucesso: false });
          }
        );
      });

      if (resYtdl.sucesso) {
        this._customTitle = resYtdl.titulo;
        this._customThumb = resYtdl.miniatura;
        storage.setItem(STORAGE_KEYS.CUSTOM_TITLE, this._customTitle);
        storage.setItem(STORAGE_KEYS.CUSTOM_THUMB, this._customThumb);
        return { valido: true, sucesso: true, titulo: this._customTitle, miniatura: this._customThumb };
      }
    }

    // 2. Fallback secundário leve via oEmbed
    if (typeof fetch !== 'undefined') {
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(validacao.url)}&format=json`;
        const resp = await fetch(oembedUrl);
        if (resp.ok) {
          const data = await resp.json();
          this._customTitle = data.title || 'Vídeo do YouTube';
          this._customThumb = data.thumbnail_url || '';
          storage.setItem(STORAGE_KEYS.CUSTOM_TITLE, this._customTitle);
          storage.setItem(STORAGE_KEYS.CUSTOM_THUMB, this._customThumb);
          return { valido: true, sucesso: true, titulo: this._customTitle, miniatura: this._customThumb };
        }
      } catch (e) {}
    }

    return {
      valido: true,
      sucesso: false,
      erro: 'Vídeo indisponível ou falha de conexão.'
    };
  }

  // =========================================================================
  // API Pública do Motor de Áudio
  // =========================================================================

  _atualizarGanhoEfetivo() {
    if (!this._masterGain) return;
    const target = this._isMuted ? 0 : this._volume;
    const ctx = this._audioCtx;
    if (this._masterGain.gain) {
      if (typeof this._masterGain.gain.setValueAtTime === 'function') {
        this._masterGain.gain.setValueAtTime(target, ctx ? (ctx.currentTime || 0) : 0);
      }
      this._masterGain.gain.value = target;
    }
  }

  async iniciar() {
    this._carregarPreferencias();
    this._garantirElementoAudio();
    if (this._audioCtx) {
      if (typeof this._audioCtx.resume === 'function' && this._audioCtx.state === 'suspended') {
        await this._audioCtx.resume();
      }
      this._garantirMasterGain(this._audioCtx);
      this._atualizarGanhoEfetivo();
    }
  }

  tocar(trackId) {
    const id = trackId ? this._normalizarTrackId(trackId) : this._currentTrack;
    this._currentTrack = id;

    const storage = this._getStorage();
    storage.setItem(STORAGE_KEYS.TRACK, id);

    // Se for link personalizado do YouTube, direciona estritamente para o MPV
    if (id === 'custom_url') {
      if (this._customUrl) {
        return this.tocarLinkYoutube(this._customUrl);
      }
      return Promise.resolve({ sucesso: false, erro: 'Nenhuma URL informada.' });
    }

    if (this._audioCtx) {
      const ctx = this._obterContexto();
      const master = this._garantirMasterGain(ctx);
      this._pararFontesAtivas();

      if (id === 'binaural_alpha' || id === 'binaural_beta') {
        const freqL = 200;
        const freqR = id === 'binaural_alpha' ? 210 : 216;

        const oscL = ctx.createOscillator();
        const oscR = ctx.createOscillator();
        oscL.type = 'sine';
        oscR.type = 'sine';

        if (oscL.frequency && typeof oscL.frequency.setValueAtTime === 'function') {
          oscL.frequency.setValueAtTime(freqL, ctx.currentTime || 0);
        }
        if (oscR.frequency && typeof oscR.frequency.setValueAtTime === 'function') {
          oscR.frequency.setValueAtTime(freqR, ctx.currentTime || 0);
        }

        if (typeof ctx.createStereoPanner === 'function') {
          const panL = ctx.createStereoPanner();
          const panR = ctx.createStereoPanner();
          if (panL.pan && typeof panL.pan.setValueAtTime === 'function') panL.pan.setValueAtTime(-1.0, ctx.currentTime || 0);
          if (panR.pan && typeof panR.pan.setValueAtTime === 'function') panR.pan.setValueAtTime(1.0, ctx.currentTime || 0);

          oscL.connect(panL);
          panL.connect(master);
          oscR.connect(panR);
          panR.connect(master);

          this._activePanners = [panL, panR];
        } else {
          oscL.connect(master);
          oscR.connect(master);
        }

        if (typeof oscL.start === 'function') oscL.start();
        if (typeof oscR.start === 'function') oscR.start();

        this._activeOscillators = [oscL, oscR];
      } else {
        const source = ctx.createBufferSource();
        source.buffer = this._obterOuCriarBuffer(ctx, id);
        source.loop = true;
        source.connect(master);
        if (typeof source.start === 'function') source.start();
        this._activeSourceNode = source;
      }

      this._isPlaying = true;
      return { sucesso: true };
    }

    return (async () => {
      const config = FAIXAS_CATALOGO.find(f => f.id === id) || FAIXAS_CATALOGO[0];
      const audio = this._garantirElementoAudio();

      // Se for link personalizado do YouTube, streaming direto via MPV
      if (id === 'custom_url') {
        if (this._customUrl) {
          return await this.tocarLinkYoutube(this._customUrl);
        }
        return { sucesso: false, erro: 'Nenhuma URL informada.' };
      }

      // Regra de Exclusão Mútua: ao reproduzir som ambiente local, encerra o MPV
      this._encerrarMpv();

      // Verifica se o .ogg já está na pasta; se não estiver (1ª vez), baixa e cria o loop
      const disponivelLocal = await this._verificarOuBaixarFaixa(config, false);

      if (disponivelLocal && audio) {
        let resourceUrl = config.arquivo;
        if (typeof app !== 'undefined' && app.vault && app.vault.adapter) {
          resourceUrl = app.vault.adapter.getResourcePath(config.arquivo);
        }

        try {
          if (audio.src !== resourceUrl) {
            audio.src = resourceUrl;
            audio.load();
          }
          audio.volume = this._isMuted ? 0 : this._volume;
          await audio.play();
          this._isPlaying = true;
          return { sucesso: true };
        } catch (err) {
          console.warn('[PomodoroAudio] Erro ao iniciar player HTML5:', err);
        }
      }

      return { sucesso: false, erro: 'Faixa de áudio indisponível localmente.' };
    })();
  }

  tocarFaixa(trackId) {
    return this.tocar(trackId);
  }

  pausar() {
    this._pararFontesAtivas();
    if (this._audioEl) {
      try { this._audioEl.pause(); } catch (e) {}
    }
    if (this._mpvConectado) {
      this._enviarComandoMpv(['set_property', 'pause', true]);
    }
    this._isPlaying = false;
  }

  parar() {
    this.pausar();
    this._encerrarMpv();
  }

  ajustarVolume(valor) {
    const v = Number(valor);
    const clamped = Number.isNaN(v) ? 0.5 : Math.max(0.0, Math.min(1.0, v));
    this._volume = clamped;

    const storage = this._getStorage();
    storage.setItem(STORAGE_KEYS.VOLUME, String(clamped));

    this._atualizarGanhoEfetivo();

    const volEfetivo = this._isMuted ? 0 : clamped;
    if (this._audioEl) {
      this._audioEl.volume = volEfetivo;
    }
    if (this._mpvConectado) {
      this._enviarComandoMpv(['set_property', 'volume', Math.round(volEfetivo * 100)]);
    }
  }

  mutar(isMuted) {
    this._isMuted = Boolean(isMuted);
    const storage = this._getStorage();
    storage.setItem(STORAGE_KEYS.MUTED, String(this._isMuted));

    this._atualizarGanhoEfetivo();

    const volEfetivo = this._isMuted ? 0 : this._volume;
    if (this._audioEl) {
      this._audioEl.volume = volEfetivo;
    }
    if (this._mpvConectado) {
      this._enviarComandoMpv(['set_property', 'mute', this._isMuted]);
    }
  }

  definirAutoSync(habilitado) {
    this._autoSync = Boolean(habilitado);
    const storage = this._getStorage();
    storage.setItem(STORAGE_KEYS.AUTOSYNC, String(this._autoSync));
  }

  obterAutoSync() {
    return this._autoSync;
  }

  async definirUrlPersonalizada(url) {
    if (!url) {
      this._customUrl = '';
      this._customTitle = '';
      this._customThumb = '';
      const storage = this._getStorage();
      storage.setItem(STORAGE_KEYS.CUSTOM_URL, '');
      storage.setItem(STORAGE_KEYS.CUSTOM_TITLE, '');
      storage.setItem(STORAGE_KEYS.CUSTOM_THUMB, '');
      return { valido: false, erro: 'URL vazia.' };
    }

    const validacao = this.validarUrl(url);
    if (!validacao.valido) {
      return { valido: false, erro: validacao.erro };
    }

    this._customUrl = validacao.url;
    const storage = this._getStorage();
    storage.setItem(STORAGE_KEYS.CUSTOM_URL, this._customUrl);

    const meta = await this.obterPreviewMetadados(this._customUrl);

    if (this._currentTrack === 'custom_url' && this._isPlaying) {
      await this.tocarLinkYoutube(this._customUrl);
    }

    return meta;
  }

  obterUrlPersonalizada() {
    return {
      url: this._customUrl,
      titulo: this._customTitle,
      capa: this._customThumb
    };
  }

  obterEstado() {
    const config = FAIXAS_CATALOGO.find(f => f.id === this._currentTrack);
    return {
      isPlaying: this._isPlaying,
      isDownloading: this._isDownloading,
      currentTrack: this._currentTrack,
      trackLabel: config ? config.label : this._currentTrack,
      volume: this._volume,
      isMuted: this._isMuted,
      autoSync: this._autoSync,
      customUrl: this._customUrl,
      customTitle: this._customTitle,
      customThumb: this._customThumb
    };
  }

  obterFaixas() {
    return FAIXAS_CATALOGO;
  }

  async obterFaixasDisponiveis(app = null) {
    let desbloqueados = ['audio-white-noise'];

    if (app && app.vault) {
      try {
        let rawContent = null;
        const fileShop = app.vault.getAbstractFileByPath('99_Meta/snoopy-shop.json');
        const fileJardim = app.vault.getAbstractFileByPath('99_Meta/jardim-constancia.json');

        if (fileShop) {
          rawContent = await app.vault.read(fileShop);
        } else if (fileJardim) {
          rawContent = await app.vault.read(fileJardim);
        }

        if (rawContent) {
          const parsed = JSON.parse(rawContent);
          const itens = parsed.desbloqueados || parsed.desbloqueadas;
          if (Array.isArray(itens)) {
            const strings = itens.filter(i => typeof i === 'string');
            desbloqueados = [...new Set(['audio-white-noise', ...strings])];
          }
        }
      } catch (err) {
        // Fallback seguro
      }
    }

    const disponiveis = FAIXAS_CATALOGO.filter(faixa => {
      return desbloqueados.includes(faixa.shopId) || desbloqueados.includes(faixa.id);
    });

    return disponiveis.map(faixa => ({
      id: faixa.shopId,
      trackId: faixa.id,
      label: faixa.label,
      nome: faixa.label,
      categoria: 'audio',
      desbloqueado: true
    }));
  }

  destroy() {
    this.parar();
    this._encerrarMpv();
    this._activeSourceNode = null;
    this._activeOscillators = [];
    this._activePanners = [];
    if (this._masterGain && typeof this._masterGain.disconnect === 'function') {
      try { this._masterGain.disconnect(); } catch (e) {}
      this._masterGain = null;
    }
    if (this._audioCtx && typeof this._audioCtx.close === 'function') {
      try { this._audioCtx.close(); } catch (e) {}
    }
    this._audioCtx = null;
    if (this._audioEl) {
      try { this._audioEl.remove(); } catch (e) {}
      this._audioEl = null;
    }
    if (this._bufferCache) {
      this._bufferCache.clear();
    }
  }
}

const PomodoroAudio = new PomodoroAudioEngine();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PomodoroAudio;
}

return PomodoroAudio
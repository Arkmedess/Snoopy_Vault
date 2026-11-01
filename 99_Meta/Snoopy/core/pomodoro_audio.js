/**
 * Snoopy Vault - Núcleo de Áudio Procedural de Foco (PomodoroAudio)
 * Motor de síntese sonora procedural via Web Audio API pura (zero arquivos externos de áudio).
 * Fornece ruídos mascaradores (branco, marrom, rosa), chuva estocástica e batimentos binaurais (alfa, beta).
 *
 * @module core/pomodoro_audio
 */

const STORAGE_KEYS = {
  VOLUME: 'snoopy_pomodoro_audio_volume',
  MUTED: 'snoopy_pomodoro_audio_muted',
  AUTOSYNC: 'snoopy_pomodoro_audio_autosync',
  TRACK: 'snoopy_pomodoro_audio_track'
};

const FAIXAS_PROCEDURAIS = [
  {
    id: 'white_noise',
    shopId: 'audio-white-noise',
    label: 'Ruído Branco Puro',
    descricao: 'Mascaramento acústico uniforme em todo o espectro de frequências.',
    tipo: 'buffer',
    gratuita: true
  },
  {
    id: 'brown_noise',
    shopId: 'audio-brown-noise',
    label: 'Ruído Marrom Profundo',
    descricao: 'Atenuação de 6dB/oitava com graves aveludados e relaxamento contínuo.',
    tipo: 'buffer',
    gratuita: false
  },
  {
    id: 'pink_noise',
    shopId: 'audio-pink-noise',
    label: 'Ruído Rosa Relaxante',
    descricao: 'Densidade equilibrada de 3dB/oitava para concentração e leitura.',
    tipo: 'buffer',
    gratuita: false
  },
  {
    id: 'procedural_rain',
    shopId: 'audio-procedural-rain',
    label: 'Chuva Zen Procedural',
    descricao: 'Gotas de amortecimento exponencial sobre leito sutil de ruído rosa.',
    tipo: 'buffer',
    gratuita: false
  },
  {
    id: 'binaural_alpha',
    shopId: 'audio-binaural-alpha',
    label: 'Ondas Alfa 10Hz',
    descricao: 'Batimento binaural estéreo de 10 Hz para alerta sereno e retenção.',
    tipo: 'oscillator',
    freqL: 200,
    freqR: 210,
    gratuita: false
  },
  {
    id: 'binaural_beta',
    shopId: 'audio-binaural-beta',
    label: 'Ondas Beta 16Hz',
    descricao: 'Batimento binaural estéreo de 16 Hz para foco analítico de alta performance.',
    tipo: 'oscillator',
    freqL: 200,
    freqR: 216,
    gratuita: false
  }
];

class PomodoroAudioEngine {
  constructor() {
    this._audioCtx = null;
    this._masterGain = null;
    this._injectedStorage = null;
    this._activeSourceNode = null;
    this._activeOscillators = [];
    this._activePanners = [];
    this._bufferCache = new Map();
    this._isPlaying = false;
    this._currentTrack = 'white_noise';
    this._volume = 0.5;
    this._isMuted = false;
    this._autoSync = true;
  }

  // =========================================================================
  // Configuração e Injeção de Dependências
  // =========================================================================

  /**
   * Conecta um contexto de áudio externo (útil para testes em Node.js ou mocks).
   *
   * @param {object} ctx - Instância compatível com AudioContext.
   */
  conectarContexto(ctx) {
    if (this._isPlaying) {
      this.parar();
    }
    this._audioCtx = ctx;
    this._masterGain = null;
    this._bufferCache.clear();
  }

  /**
   * Conecta uma implementação de storage externa para testes.
   *
   * @param {object} storage - Interface tipo localStorage.
   */
  conectarStorage(storage) {
    this._injectedStorage = storage;
    this._carregarPreferencias();
  }

  /**
   * Obtém a instância ativa de storage (injetada, localStorage global ou memória).
   *
   * @private
   * @returns {object}
   */
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

  /**
   * Carrega preferências de volume, mudo e faixa inicial salvas.
   *
   * @private
   */
  _carregarPreferencias() {
    const storage = this._getStorage();
    const volStr = storage.getItem(STORAGE_KEYS.VOLUME);
    if (volStr !== null) {
      const v = parseFloat(volStr);
      if (!Number.isNaN(v)) {
        this._volume = Math.max(0.0, Math.min(1.0, v));
      }
    }

    const mutedStr = storage.getItem(STORAGE_KEYS.MUTED);
    if (mutedStr !== null) {
      this._isMuted = mutedStr === 'true';
    }

    const syncStr = storage.getItem(STORAGE_KEYS.AUTOSYNC);
    if (syncStr !== null) {
      this._autoSync = syncStr !== 'false';
    }

    const trackStr = storage.getItem(STORAGE_KEYS.TRACK);
    if (trackStr) {
      this._currentTrack = this._normalizarTrackId(trackStr);
    }
  }

  /**
   * Inicializa ou recupera o AudioContext ativo.
   *
   * @private
   * @returns {object|null}
   */
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

  /**
   * Garante a criação do nó Master Gain e conexão ao destino.
   *
   * @private
   * @param {object} ctx - Contexto de áudio.
   * @returns {object}
   */
  _garantirMasterGain(ctx) {
    if (this._masterGain) return this._masterGain;
    const gainNode = ctx.createGain();
    const effectiveGain = this._isMuted ? 0 : this._volume;
    if (gainNode.gain && typeof gainNode.gain.setValueAtTime === 'function') {
      gainNode.gain.setValueAtTime(effectiveGain, ctx.currentTime || 0);
    }
    gainNode.connect(ctx.destination);
    this._masterGain = gainNode;
    return gainNode;
  }

  /**
   * Normaliza qualquer identificador de faixa para o ID canônico interno.
   *
   * @private
   * @param {string} id - Identificador puro ou de loja.
   * @returns {string}
   */
  _normalizarTrackId(id) {
    if (!id) return 'white_noise';
    const clean = String(id).replace(/^audio-/, '').replace(/-/g, '_');
    const matched = FAIXAS_PROCEDURAIS.find(f => f.id === clean || f.shopId === id || f.id === id);
    return matched ? matched.id : clean;
  }

  // =========================================================================
  // Síntese Procedural das Faixas Sonoras
  // =========================================================================

  /**
   * Gera o array de amostras em Float32Array para a faixa especificada.
   *
   * @param {string} trackId - Identificador canônico da faixa.
   * @param {number} [sampleRate=44100] - Taxa de amostragem.
   * @param {number} [durationSec=4.0] - Duração do buffer em segundos.
   * @returns {Float32Array}
   */
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

    if (id === 'procedural_rain') {
      // 1. Leito suave de ruído rosa atenuado
      let b0 = 0.0, b1 = 0.0, b2 = 0.0;
      for (let i = 0; i < totalSamples; i++) {
        const white = (Math.random() * 2) - 1.0;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        samples[i] = (b0 + b1 + b2) * 0.08;
      }

      // 2. Gotas aleatórias amortecidas
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

    // Fallback: ruído branco
    for (let i = 0; i < totalSamples; i++) {
      samples[i] = (Math.random() * 2) - 1.0;
    }
    return samples;
  }

  /**
   * Obtém ou sintetiza um AudioBuffer pré-calculado em loop.
   *
   * @private
   * @param {object} ctx - Contexto de áudio.
   * @param {string} trackId - Identificador da faixa.
   * @returns {object}
   */
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

  /**
   * Para com segurança todos os nós geradores ativos.
   *
   * @private
   */
  _pararFontesAtivas() {
    if (this._activeSourceNode) {
      try {
        if (typeof this._activeSourceNode.stop === 'function') this._activeSourceNode.stop();
        if (typeof this._activeSourceNode.disconnect === 'function') this._activeSourceNode.disconnect();
      } catch (err) {
        // Ignora erros de nós já finalizados
      }
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

  // =========================================================================
  // API Pública do Motor de Áudio
  // =========================================================================

  /**
   * Inicializa o motor e desbloqueia o AudioContext sob interação do usuário.
   *
   * @returns {Promise<void>}
   */
  async iniciar() {
    this._carregarPreferencias();
    const ctx = this._obterContexto();
    if (!ctx) return;
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      await ctx.resume();
    }
    this._garantirMasterGain(ctx);
  }

  /**
   * Inicia a reprodução procedural da faixa sonora solicitada.
   *
   * @param {string} [trackId] - Faixa procedural (ex: 'white_noise', 'audio-brown-noise').
   */
  tocar(trackId) {
    const id = trackId ? this._normalizarTrackId(trackId) : this._currentTrack;
    this._currentTrack = id;

    const storage = this._getStorage();
    storage.setItem(STORAGE_KEYS.TRACK, id);

    const ctx = this._obterContexto();
    if (!ctx) return;

    const master = this._garantirMasterGain(ctx);
    this._pararFontesAtivas();

    const config = FAIXAS_PROCEDURAIS.find(f => f.id === id);
    const tipo = config ? config.tipo : 'buffer';

    if (tipo === 'oscillator') {
      // Síntese de Tons Binaurais Estéreo
      const freqL = (config && config.freqL) ? config.freqL : 200;
      const freqR = (config && config.freqR) ? config.freqR : 210;

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
      // Síntese por BufferSource em loop contínuo
      const source = ctx.createBufferSource();
      source.buffer = this._obterOuCriarBuffer(ctx, id);
      source.loop = true;
      source.connect(master);
      if (typeof source.start === 'function') source.start();
      this._activeSourceNode = source;
    }

    this._isPlaying = true;
  }

  /**
   * Alias de compatibilidade para tocar().
   */
  tocarFaixa(trackId) {
    return this.tocar(trackId);
  }

  /**
   * Pausa a reprodução ativa de áudio.
   */
  pausar() {
    this._pararFontesAtivas();
    this._isPlaying = false;
  }

  /**
   * Para a reprodução e redefine o estado.
   */
  parar() {
    this.pausar();
  }

  /**
   * Ajusta o volume sonoro com limitação rigorosa entre 0.0 e 1.0 e persistência.
   *
   * @param {number} valor - Volume de 0.0 a 1.0.
   */
  ajustarVolume(valor) {
    const v = Number(valor);
    const clamped = Number.isNaN(v) ? 0.5 : Math.max(0.0, Math.min(1.0, v));
    this._volume = clamped;

    const storage = this._getStorage();
    storage.setItem(STORAGE_KEYS.VOLUME, String(clamped));

    this._atualizarGanhoEfetivo();
  }

  /**
   * Alterna ou define o status de mudo.
   *
   * @param {boolean} isMuted - Se verdadeiro, silencia o áudio.
   */
  mutar(isMuted) {
    this._isMuted = Boolean(isMuted);

    const storage = this._getStorage();
    storage.setItem(STORAGE_KEYS.MUTED, String(this._isMuted));

    this._atualizarGanhoEfetivo();
  }

  /**
   * Atualiza o ganho no nó master do Web Audio API.
   *
   * @private
   */
  _atualizarGanhoEfetivo() {
    if (!this._masterGain) return;
    const target = this._isMuted ? 0 : this._volume;
    const ctx = this._audioCtx;
    if (this._masterGain.gain && typeof this._masterGain.gain.setValueAtTime === 'function') {
      this._masterGain.gain.setValueAtTime(target, ctx ? (ctx.currentTime || 0) : 0);
    }
  }

  /**
   * Define o status de sincronização com o timer do Pomodoro.
   *
   * @param {boolean} habilitado
   */
  definirAutoSync(habilitado) {
    this._autoSync = Boolean(habilitado);
    const storage = this._getStorage();
    storage.setItem(STORAGE_KEYS.AUTOSYNC, String(this._autoSync));
  }

  /**
   * Obtém a preferência de sincronização automática com o timer.
   *
   * @returns {boolean}
   */
  obterAutoSync() {
    return this._autoSync;
  }

  /**
   * Retorna o snapshot do estado atual do motor de áudio.
   *
   * @returns {object}
   */
  obterEstado() {
    return {
      isPlaying: this._isPlaying,
      currentTrack: this._currentTrack,
      volume: this._volume,
      isMuted: this._isMuted,
      autoSync: this._autoSync,
      contextState: this._audioCtx ? this._audioCtx.state : 'uninitialized'
    };
  }

  /**
   * Retorna todas as faixas procedurais nativas suportadas pelo motor.
   *
   * @returns {Array<object>}
   */
  obterFaixas() {
    return FAIXAS_PROCEDURAIS.map(f => ({
      id: f.id,
      shopId: f.shopId,
      label: f.label,
      descricao: f.descricao,
      tipo: f.tipo,
      gratuita: f.gratuita
    }));
  }

  /**
   * Consulta as faixas desbloqueadas pelo usuário no cofre ou loja.
   *
   * @param {object|null} app - Instância do Obsidian App.
   * @returns {Promise<Array<object>>}
   */
  async obterFaixasDisponiveis(app) {
    let desbloqueados = ['white_noise', 'audio-white-noise'];

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
          const itens = parsed.desbloqueados || parsed.desbloqueadas || [];
          desbloqueados = [...new Set([...desbloqueados, ...itens])];
        }
      } catch (err) {
        // Fallback seguro para faixas gratuitas
      }
    }

    const disponiveis = FAIXAS_PROCEDURAIS.filter(faixa => {
      if (faixa.gratuita) return true;
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

  /**
   * Limpa recursos, para nós ativos e encerra o contexto ao destruir a view.
   */
  destroy() {
    this.parar();
    if (this._masterGain) {
      try {
        if (typeof this._masterGain.disconnect === 'function') this._masterGain.disconnect();
      } catch (err) {}
      this._masterGain = null;
    }
    if (this._audioCtx) {
      try {
        if (typeof this._audioCtx.close === 'function') this._audioCtx.close();
      } catch (err) {}
      this._audioCtx = null;
    }
    this._bufferCache.clear();
  }
}

// Instância singleton do motor de áudio
const PomodoroAudio = new PomodoroAudioEngine();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PomodoroAudio;
}

return PomodoroAudio;

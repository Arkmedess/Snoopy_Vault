/**
 * Snoopy Vault - Submódulo: Pomodoro Timer & Máquina de Estados
 * Controla a contagem regressiva, alternância entre modos (foco e pausa),
 * cálculo da geometria do anel circular SVG e disparo de notificações.
 *
 * @module modulos/pomodoro/pomodoro_timer
 */

const CIRCLE_CIRCUMFERENCE = 464.96;

class PomodoroTimer {
  /**
   * Inicializa o temporizador Pomodoro.
   *
   * @param {object} config - Opções de configuração e callbacks.
   * @param {number} [config.focusMin=25] - Tempo de foco em minutos.
   * @param {number} [config.breakMin=5] - Tempo de pausa em minutos.
   * @param {string} [config.initialState='idle'] - Estado inicial ('idle'|'running'|'paused'|'finished').
   * @param {Function} [config.onTick] - Callback a cada tick com { remaining, total, timeStr, offset }.
   * @param {Function} [config.onComplete] - Callback ao finalizar o tempo de foco ou pausa.
   * @param {Function} [config.onModeChange] - Callback ao alternar modo { mode, totalSeconds }.
   * @param {Function} [config.onRunningChange] - Callback ao pausar/iniciar { isRunning, state }.
   */
  constructor(config = {}) {
    this.focusMin = Number(config.focusMin) || 25;
    this.breakMin = Number(config.breakMin) || 5;
    this.onTick = config.onTick || (() => {});
    this.onComplete = config.onComplete || (() => {});
    this.onModeChange = config.onModeChange || (() => {});
    this.onRunningChange = config.onRunningChange || (() => {});

    this.currentMode = config.initialMode === 'pausa' ? 'pausa' : 'foco'; // 'foco' | 'pausa'
    this.totalSeconds = (this.currentMode === 'foco' ? this.focusMin : this.breakMin) * 60;
    this.remainingSeconds = typeof config.initialRemaining === 'number' ? config.initialRemaining : this.totalSeconds;
    this.remainingMs = typeof config.remainingMs === 'number'
      ? config.remainingMs
      : (this.remainingSeconds * 1000);

    this.timerInterval = null;
    this.completeTimeout = null;
    this.alvoAtual = config.initialAlvo || null;
    this.endAt = config.endAt || null;

    // Máquina de estados explícita: 'idle' | 'running' | 'paused' | 'finished'
    this.state = config.initialState || 'idle';
    if (this.endAt && !config.initialState) {
      this.state = this.endAt > Date.now() ? 'running' : 'finished';
    }
  }

  /**
   * Formata segundos em string 'MM:SS'.
   *
   * @param {number} segundos - Segundos restantes.
   * @returns {string} Tempo formatado.
   */
  formatarTempo(segundos) {
    const s = Math.max(0, Math.floor(segundos));
    const m = Math.floor(s / 60);
    const rest = s % 60;
    return `${String(m).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
  }

  /**
   * Calcula o valor de strokeDashoffset para o círculo SVG.
   *
   * @param {number} restantes - Segundos restantes.
   * @param {number} total - Total de segundos do ciclo atual.
   * @param {number} [circunferencia=CIRCLE_CIRCUMFERENCE] - Perímetro do anel SVG.
   * @returns {number} Valor numérico de deslocamento.
   */
  calcularStrokeOffset(restantes, total, circunferencia = CIRCLE_CIRCUMFERENCE) {
    if (total <= 0) return 0;
    const fraction = restantes / total;
    return circunferencia * (1 - fraction);
  }

  /**
   * Atualiza a duração dos ciclos de foco e pausa.
   *
   * @param {number} novoFoco - Novo tempo de foco em minutos.
   * @param {number} novaPausa - Novo tempo de pausa em minutos.
   */
  setTempos(novoFoco, novaPausa) {
    if (novoFoco) this.focusMin = Number(novoFoco) || 25;
    if (novaPausa) this.breakMin = Number(novaPausa) || 5;

    this.totalSeconds = (this.currentMode === 'foco' ? this.focusMin : this.breakMin) * 60;

    if (this.state === 'idle') {
      this.remainingSeconds = this.totalSeconds;
      this.remainingMs = this.totalSeconds * 1000;
      this._notificarTick();
    } else if (this.state === 'paused') {
      this._notificarTick();
    }
  }

  /**
   * Alterna o modo de operação do temporizador.
   *
   * @param {'foco'|'pausa'} mode - Modo desejado.
   */
  setMode(mode) {
    this._limparAgendamentos();
    this.endAt = null;
    this.currentMode = mode === 'pausa' ? 'pausa' : 'foco';
    this.totalSeconds = (this.currentMode === 'foco' ? this.focusMin : this.breakMin) * 60;
    this.remainingSeconds = this.totalSeconds;
    this.remainingMs = this.totalSeconds * 1000;
    this.state = 'idle';

    this.onRunningChange({ isRunning: false, state: this.state });
    this.onModeChange({ mode: this.currentMode, totalSeconds: this.totalSeconds });
    this._notificarTick();
  }

  /**
   * Estende o tempo de foco adicionando minutos extras e iniciando a contagem imediatamente.
   *
   * @param {number} [minutos=5] - Minutos adicionais de foco.
   */
  estenderFoco(minutos = 5) {
    this._limparAgendamentos();
    const segs = Math.max(1, Math.floor(Number(minutos) * 60) || 300);
    this.currentMode = 'foco';
    this.totalSeconds = segs;
    this.remainingSeconds = segs;
    this.remainingMs = segs * 1000;
    this.endAt = null;
    this.state = 'idle';

    this.onModeChange({ mode: this.currentMode, totalSeconds: this.totalSeconds });
    this.start();
  }

  /**
   * Inicia ou pausa o temporizador.
   *
   * @returns {boolean} Retorna true se agora está em execução, false se pausado.
   */
  toggle() {
    if (this.state === 'running') {
      this.pause();
      return false;
    }
    this.start();
    return true;
  }

  /**
   * Inicia a contagem regressiva.
   */
  start() {
    if (this.state === 'running') return;

    this._limparAgendamentos();

    // Se estiver hidratando ou recuperando com endAt anterior
    if (this.endAt) {
      this.remainingMs = Math.max(0, this.endAt - Date.now());
      this.remainingSeconds = Math.max(0, Math.ceil(this.remainingMs / 1000));
    }

    if (this.remainingMs <= 0) {
      this._finalizar();
      return;
    }

    this.state = 'running';
    this.endAt = Date.now() + this.remainingMs;
    this.onRunningChange({ isRunning: true, state: this.state });

    // Timeout de término exato no milissegundo de término
    this.completeTimeout = setTimeout(() => {
      if (this.state !== 'running') return;
      this._finalizar();
    }, this.remainingMs);

    // Intervalo de pulso a cada 1000ms para atualizar visual e listeners
    this.timerInterval = setInterval(() => {
      // Guard estrito: ignora qualquer tick caso o timer não esteja em running
      if (this.state !== 'running') return;

      const diffMs = this.endAt - Date.now();
      this.remainingMs = Math.max(0, diffMs);
      this.remainingSeconds = Math.max(0, Math.ceil(this.remainingMs / 1000));

      if (this.remainingMs > 0) {
        this._notificarTick();
      } else {
        this._finalizar();
      }
    }, 1000);
  }

  /**
   * Finaliza o ciclo atual disparando os callbacks correspondentes.
   *
   * @private
   */
  _finalizar() {
    this._limparAgendamentos();
    this.state = 'finished';
    this.endAt = null;
    this.remainingSeconds = 0;
    this.remainingMs = 0;
    this._notificarTick();
    this.onRunningChange({ isRunning: false, state: this.state });
    const modoFinalizado = this.currentMode;
    this.onComplete({ mode: modoFinalizado, alvo: this.alvoAtual });
  }

  /**
   * Pausa a contagem regressiva.
   */
  pause() {
    if (this.state !== 'running') return;

    if (this.endAt) {
      this.remainingMs = Math.max(0, this.endAt - Date.now());
      this.remainingSeconds = Math.max(0, Math.ceil(this.remainingMs / 1000));
    }
    this._limparAgendamentos();
    this.endAt = null;
    this.state = 'paused';
    this.onRunningChange({ isRunning: false, state: this.state });
  }

  /**
   * Reinicia o tempo restante para o total do modo ativo.
   */
  reset() {
    this._limparAgendamentos();
    this.endAt = null;
    this.totalSeconds = (this.currentMode === 'foco' ? this.focusMin : this.breakMin) * 60;
    this.remainingSeconds = this.totalSeconds;
    this.remainingMs = this.totalSeconds * 1000;
    this.state = 'idle';
    this.onRunningChange({ isRunning: false, state: this.state });
    this.onModeChange({ mode: this.currentMode, totalSeconds: this.totalSeconds });
    this._notificarTick();
  }

  /**
   * Define o alvo de foco direcionado (tarefa ou disciplina).
   *
   * @param {object|null} alvo - Objeto com texto/título ou null para desarmar.
   */
  setAlvo(alvo) {
    this.alvoAtual = alvo;
  }

  /**
   * Dispara a notificação de tick com os dados geométricos e textuais atuais.
   *
   * @private
   */
  _notificarTick() {
    const timeStr = this.formatarTempo(this.remainingSeconds);
    const offset = this.calcularStrokeOffset(this.remainingSeconds, this.totalSeconds);
    this.onTick({
      remaining: this.remainingSeconds,
      total: this.totalSeconds,
      timeStr,
      offset
    });
  }

  /**
   * Limpa referências ativas de intervalos e timeouts de forma atômica e centralizada.
   *
   * @private
   */
  _limparAgendamentos() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.completeTimeout) {
      clearTimeout(this.completeTimeout);
      this.completeTimeout = null;
    }
  }

  /**
   * Destrói o timer limpando qualquer intervalo pendente na memória.
   */
  destroy() {
    this._limparAgendamentos();
    this.endAt = null;
    if (this.state === 'running') {
      this.state = 'paused';
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PomodoroTimer;
}

return PomodoroTimer;


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
   * @param {Function} [config.onTick] - Callback a cada tick com { remaining, total, timeStr, offset }.
   * @param {Function} [config.onComplete] - Callback ao finalizar o tempo de foco ou pausa.
   * @param {Function} [config.onModeChange] - Callback ao alternar modo { mode, totalSeconds }.
   * @param {Function} [config.onRunningChange] - Callback ao pausar/iniciar { isRunning }.
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
    this.timerInterval = null;
    this.alvoAtual = config.initialAlvo || null;
    this.endAt = config.endAt || null;
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

    if (!this.timerInterval) {
      this.setMode(this.currentMode);
    }
  }

  /**
   * Alterna o modo de operação do temporizador.
   *
   * @param {'foco'|'pausa'} mode - Modo desejado.
   */
  setMode(mode) {
    this.pause();
    this.currentMode = mode === 'pausa' ? 'pausa' : 'foco';
    this.totalSeconds = (this.currentMode === 'foco' ? this.focusMin : this.breakMin) * 60;
    this.remainingSeconds = this.totalSeconds;

    this.onModeChange({ mode: this.currentMode, totalSeconds: this.totalSeconds });
    this._notificarTick();
  }

  /**
   * Inicia ou pausa o temporizador.
   *
   * @returns {boolean} Retorna true se agora está em execução, false se pausado.
   */
  toggle() {
    if (this.timerInterval) {
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
    if (this.timerInterval) return;

    if (!this.endAt) {
      this.endAt = Date.now() + (this.remainingSeconds * 1000);
    }

    this.onRunningChange({ isRunning: true });
    this.timerInterval = setInterval(() => {
      if (this.endAt) {
        const diffMs = this.endAt - Date.now();
        this.remainingSeconds = Math.max(0, Math.ceil(diffMs / 1000));
      } else if (this.remainingSeconds > 0) {
        this.remainingSeconds--;
      }

      if (this.remainingSeconds > 0) {
        this._notificarTick();
      } else {
        this.pause();
        this.endAt = null;
        const modoFinalizado = this.currentMode;
        this.onComplete({ mode: modoFinalizado, alvo: this.alvoAtual });
      }
    }, 1000);
  }

  /**
   * Pausa a contagem regressiva.
   */
  pause() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
      this.endAt = null;
      this.onRunningChange({ isRunning: false });
    }
  }

  /**
   * Reinicia o tempo restante para o total do modo ativo.
   */
  reset() {
    this.setMode(this.currentMode);
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
   * Destrói o timer limpando qualquer intervalo pendente na memória.
   */
  destroy() {
    this.pause();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PomodoroTimer;
}

return PomodoroTimer;


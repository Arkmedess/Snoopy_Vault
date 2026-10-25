/**
 * Snoopy Vault - Submódulo: Pomodoro Playlist / Fila de Foco
 * Gerencia a fila de ciclos sequenciais estilo "playlist" (vibe Spotify),
 * permitindo encadear tarefas com contagem de pomodoros e transição automática.
 *
 * @module modulos/pomodoro/pomodoro_playlist
 */

class PomodoroPlaylist {
  /**
   * Cria uma nova instância de playlist de foco.
   *
   * @param {Array<object>} [itensIniciais=[]] - Lista inicial de faixas.
   */
  constructor(itensIniciais = []) {
    this.tracks = [];
    this.currentIndex = 0;
    this.autoAdvance = true;
    this.onChange = () => {};

    if (Array.isArray(itensIniciais) && itensIniciais.length > 0) {
      itensIniciais.forEach(item => this.adicionarFaixa(item));
    }
  }

  /**
   * Adiciona uma nova faixa (tarefa/bloco de estudo) ao fim da playlist.
   *
   * @param {object} dados - Informações da faixa.
   * @param {string} dados.titulo - Nome da tarefa ou atividade.
   * @param {string} [dados.path] - Caminho do arquivo de origem no cofre.
   * @param {number} [dados.line] - Linha no arquivo de origem.
   * @param {number} [dados.pomosTotal=1] - Estimativa de pomodoros para a tarefa.
   * @param {number} [dados.pomosConcluidos=0] - Pomodoros já realizados.
   * @returns {object} A faixa criada e adicionada.
   */
  adicionarFaixa(dados = {}) {
    const id = dados.id || `track_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const faixa = {
      id,
      titulo: dados.titulo || dados.texto || 'Tarefa sem nome',
      path: dados.path || null,
      line: typeof dados.line === 'number' ? dados.line : null,
      pomosTotal: Math.max(1, Number(dados.pomosTotal || dados.pomosEst) || 1),
      pomosConcluidos: Math.max(0, Number(dados.pomosConcluidos) || 0)
    };

    this.tracks.push(faixa);
    this._notificar();
    return faixa;
  }

  /**
   * Retorna a quantidade total de faixas na playlist.
   *
   * @returns {number}
   */
  obterTamanho() {
    return this.tracks.length;
  }

  /**
   * Retorna a faixa atualmente em reprodução (foco ativo).
   *
   * @returns {object|null}
   */
  obterFaixaAtual() {
    if (this.tracks.length === 0) return null;
    if (this.currentIndex < 0) this.currentIndex = 0;
    if (this.currentIndex >= this.tracks.length) this.currentIndex = this.tracks.length - 1;
    return this.tracks[this.currentIndex];
  }

  /**
   * Retorna a lista de próximas faixas aguardando na fila.
   *
   * @returns {Array<object>}
   */
  obterProximas() {
    if (this.tracks.length <= 1 || this.currentIndex >= this.tracks.length - 1) {
      return [];
    }
    return this.tracks.slice(this.currentIndex + 1);
  }

  /**
   * Avança para a próxima faixa da playlist.
   *
   * @returns {object|null} Nova faixa atual ou null se chegou ao fim.
   */
  avancar() {
    if (this.currentIndex + 1 < this.tracks.length) {
      this.currentIndex++;
      this._notificar();
      return this.obterFaixaAtual();
    }
    return null;
  }

  /**
   * Retrocede para a faixa anterior da playlist.
   *
   * @returns {object|null} Nova faixa atual ou a primeira se já no início.
   */
  retroceder() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this._notificar();
      return this.obterFaixaAtual();
    }
    return this.obterFaixaAtual();
  }

  /**
   * Seleciona diretamente uma faixa pelo seu índice na fila.
   *
   * @param {number} index
   * @returns {object|null}
   */
  selecionarFaixa(index) {
    if (index >= 0 && index < this.tracks.length) {
      this.currentIndex = index;
      this._notificar();
      return this.obterFaixaAtual();
    }
    return null;
  }

  /**
   * Registra a conclusão de um ciclo na faixa atual.
   * Incrementa pomosConcluidos e avança a fila caso tenha atingido o total estipulado.
   *
   * @returns {{ atingiuTotal: boolean, faixa: object|null }}
   */
  concluirCicloNaFaixaAtual() {
    const atual = this.obterFaixaAtual();
    if (!atual) return { atingiuTotal: false, faixa: null };

    atual.pomosConcluidos++;
    const atingiuTotal = atual.pomosConcluidos >= atual.pomosTotal;

    if (atingiuTotal && this.autoAdvance) {
      this.avancar();
    }

    this._notificar();
    return { atingiuTotal, faixa: atual };
  }

  /**
   * Remove uma faixa da playlist pelo seu ID.
   *
   * @param {string} id
   * @returns {boolean} True se removeu com sucesso.
   */
  removerFaixa(id) {
    const idx = this.tracks.findIndex(t => t.id === id);
    if (idx === -1) return false;

    this.tracks.splice(idx, 1);
    if (this.currentIndex >= this.tracks.length && this.tracks.length > 0) {
      this.currentIndex = this.tracks.length - 1;
    }
    this._notificar();
    return true;
  }

  /**
   * Limpa todas as faixas da playlist.
   */
  limpar() {
    this.tracks = [];
    this.currentIndex = 0;
    this._notificar();
  }

  /**
   * Serializa o estado da playlist para persistência na janela/sessão.
   *
   * @returns {object}
   */
  serializar() {
    return {
      tracks: this.tracks.map(t => ({ ...t })),
      currentIndex: this.currentIndex,
      autoAdvance: this.autoAdvance
    };
  }

  /**
   * Restaura o estado da playlist a partir de dados serializados.
   *
   * @param {object} dados
   */
  deserializar(dados = {}) {
    if (Array.isArray(dados.tracks)) {
      this.tracks = dados.tracks.map(t => ({ ...t }));
      this.currentIndex = Math.max(0, Math.min(Number(dados.currentIndex) || 0, this.tracks.length - 1));
      if (typeof dados.autoAdvance === 'boolean') {
        this.autoAdvance = dados.autoAdvance;
      }
      this._notificar();
    }
  }

  /**
   * Notifica ouvintes de alteração no estado da playlist.
   *
   * @private
   */
  _notificar() {
    if (typeof this.onChange === 'function') {
      try {
        this.onChange(this);
      } catch (e) {
        console.warn('[PomodoroPlaylist] Erro no callback onChange:', e);
      }
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PomodoroPlaylist;
}

return PomodoroPlaylist;

/**
 * Gerenciador de ciclo de vida para descartes e limpeza de recursos no Dataview.
 * Garante que listeners, timers e referências DOM pendentes sejam desalocados
 * antes de cada re-render do painel.
 */
class Lifecycle {
  /**
   * Obtém o mapa global de descartes no contexto global seguro.
   * @private
   * @returns {Map<string, Set<Function>>}
   */
  static _obterEscopos() {
    const globalObj = typeof window !== 'undefined' ? window : globalThis;
    if (!globalObj.__snoopyLifecycle) {
      globalObj.__snoopyLifecycle = new Map();
    }
    return globalObj.__snoopyLifecycle;
  }

  /**
   * Registra uma função de limpeza associada a um escopo.
   * @param {string} escopo - Identificador do escopo (ex: 'home', 'pomodoro').
   * @param {Function} cleanupFn - Função síncrona a ser executada no descarte.
   * @returns {Function} Função para desregistrar este cleanup individualmente.
   */
  static onDispose(escopo, cleanupFn) {
    if (typeof cleanupFn !== 'function') return () => {};

    const escopos = this._obterEscopos();
    if (!escopos.has(escopo)) {
      escopos.set(escopo, new Set());
    }

    const callbacks = escopos.get(escopo);
    callbacks.add(cleanupFn);

    return () => {
      callbacks.delete(cleanupFn);
    };
  }

  /**
   * Executa e esvazia todos os descartes registrados para um escopo.
   * @param {string} escopo - Nome do escopo a ser limpo.
   */
  static dispose(escopo) {
    const escopos = this._obterEscopos();
    if (!escopos.has(escopo)) return;

    const callbacks = escopos.get(escopo);
    for (const fn of callbacks) {
      try {
        fn();
      } catch (err) {
        console.error(`[Snoopy Lifecycle] Erro ao descartar recurso no escopo '${escopo}':`, err);
      }
    }
    callbacks.clear();
  }

  /**
   * Retorna a quantidade de descartes ativos para um determinado escopo.
   * @param {string} escopo - Nome do escopo.
   * @returns {number}
   */
  static contagem(escopo) {
    const escopos = this._obterEscopos();
    if (!escopos.has(escopo)) return 0;
    return escopos.get(escopo).size;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Lifecycle;
}
return Lifecycle;


/**
 * Gerenciador e carregador de módulos com cache de compilação na V8.
 * Evita chamadas redundantes a new Function() a cada re-render do Dataview,
 * reaproveitando o bytecode compilado enquanto a data de modificação (mtime) não mudar.
 */
class ModuleLoader {
  /**
   * Obtém o cache persistente na janela/global.
   * @private
   * @returns {Object.<string, { factory: Function, mtime: number }>}
   */
  static _obterCache() {
    const globalObj = typeof window !== 'undefined' ? window : globalThis;
    if (!globalObj.__snoopyModuleCache) {
      globalObj.__snoopyModuleCache = {};
    }
    return globalObj.__snoopyModuleCache;
  }

  /**
   * Carrega um módulo JavaScript do Vault com cache baseado em mtime.
   * @param {object} app - Instância do Obsidian App.
   * @param {string} moduloPath - Caminho relativo do arquivo no vault.
   * @returns {Promise<any>} Retorna a exportação ou instância do módulo.
   */
  static async carregar(app, moduloPath) {
    if (!app || !app.vault || !moduloPath) return null;

    const cache = this._obterCache();
    const fileExiste = app.vault.getAbstractFileByPath ? app.vault.getAbstractFileByPath(moduloPath) : null;
    const mtime = fileExiste && fileExiste.stat ? fileExiste.stat.mtime : 0;

    let factory = null;
    const cached = cache[moduloPath];
    if (cached && cached.mtime === mtime) {
      factory = cached.factory;
    } else {
      let code = '';
      if (fileExiste) {
        code = await app.vault.read(fileExiste);
      } else if (app.vault.adapter && typeof app.vault.adapter.read === 'function') {
        code = await app.vault.adapter.read(moduloPath);
      }

      if (!code) return null;

      factory = new Function(code);
      cache[moduloPath] = { factory, mtime };
    }

    try {
      return factory();
    } catch (err) {
      console.error(`[Snoopy ModuleLoader] Erro ao instanciar módulo "${moduloPath}":`, err);
      return null;
    }
  }

  /**
   * Limpa o cache de compilação em memória.
   */
  static limparCache() {
    const globalObj = typeof window !== 'undefined' ? window : globalThis;
    globalObj.__snoopyModuleCache = {};
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ModuleLoader;
}
return ModuleLoader;


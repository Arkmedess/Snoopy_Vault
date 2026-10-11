/**
 * Snoopy Vault - Microsserviço de Orquestração do Painel de Configurações
 * Consolida leitura de versões, rastreamento de backups e auditoria de estado do cofre.
 *
 * @module core/config_controller
 */
let MockManagerModule = null;
if (typeof require !== 'undefined') {
  try {
    MockManagerModule = require('./mock_manager.js');
  } catch (e) {
    // Ambiente sem require local imediato
  }
}

const ConfigController = {
  /**
   * Caminho padrão do manifesto local de integridade do cofre.
   */
  PATH_MANIFESTO: '99_Meta/Snoopy/manifest.json',

  /**
   * Diretório raiz onde os backups automáticos pré-atualização são preservados.
   */
  DIR_BACKUPS: '99_Meta/.backups/snoopy/',

  /**
   * Obtém a versão instalada no cofre a partir do manifest.json local.
   *
   * @param {object} app - Instância do Obsidian.
   * @returns {Promise<string>} Versão semântica (ex.: "0.8.0") ou "0.0.0" se ausente.
   */
  async obterVersaoLocal(app) {
    if (!app || !app.vault) return '0.0.0';
    try {
      const f = app.vault.getAbstractFileByPath ? app.vault.getAbstractFileByPath(this.PATH_MANIFESTO) : null;
      if (!f) return '0.0.0';
      const conteudo = await app.vault.read(f);
      const dados = JSON.parse(conteudo);
      return dados.versao || '0.0.0';
    } catch (e) {
      console.warn('[ConfigController] Erro ao ler manifest.json local:', e);
      return '0.0.0';
    }
  },

  /**
   * Lista todos os backups disponíveis no diretório seguro de backups, ordenados do mais recente ao mais antigo.
   *
   * @param {object} app - Instância do Obsidian.
   * @returns {Promise<Array<{ id: string, path: string }>>}
   */
  async listarBackups(app) {
    if (!app || !app.vault) return [];
    try {
      const todos = typeof app.vault.getAllLoadedFiles === 'function' ? app.vault.getAllLoadedFiles() : [];
      const backups = [];
      const vistos = new Set();

      for (const item of todos) {
        if (item.path && item.path.startsWith(this.DIR_BACKUPS)) {
          const subcaminho = item.path.slice(this.DIR_BACKUPS.length);
          const id = subcaminho.split('/')[0];
          if (id && !vistos.has(id)) {
            vistos.add(id);
            backups.push({
              id,
              path: `${this.DIR_BACKUPS}${id}`
            });
          }
        }
      }

      // Ordena decrescente pelo id (que contém timestamp ISO)
      return backups.sort((a, b) => b.id.localeCompare(a.id));
    } catch (e) {
      console.warn('[ConfigController] Erro ao listar backups:', e);
      return [];
    }
  },

  /**
   * Retorna um panorama consolidado do estado de integridade, mocks e atualizações do cofre.
   *
   * @param {object} app - Instância do Obsidian.
   * @param {object} [mockManagerCustom] - Instância injetada de MockManager (opcional).
   * @returns {Promise<{ versao: string, mocks: Array, backups: Array, ultimoBackup: string|null }>}
   */
  async verificarStatus(app, mockManagerCustom = null) {
    const versao = await this.obterVersaoLocal(app);
    const backups = await this.listarBackups(app);

    const mm = mockManagerCustom || MockManagerModule;
    let mocks = [];
    if (mm && typeof mm.detectarMocks === 'function') {
      mocks = await mm.detectarMocks(app);
    } else if (app && app.vault && typeof app.vault.getMarkdownFiles === 'function') {
      const arquivos = app.vault.getMarkdownFiles();
      mocks = arquivos
        .filter(f => f.basename && f.basename.startsWith('Exemplo - '))
        .map(f => ({ path: f.path, nome: f.basename }));
    }

    return {
      versao,
      mocks,
      backups,
      ultimoBackup: backups.length > 0 ? backups[0].id : null
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConfigController;
}

return ConfigController;

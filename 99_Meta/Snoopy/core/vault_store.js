/**
 * Snoopy Vault - Microsserviço de Persistência Cirúrgica no Vault
 * Permite adicionar, substituir, remover linhas e gerenciar arquivos
 * de forma atômica e segura.
 *
 * @module core/vault_store
 */
const VaultStore = {
  /**
   * Adiciona uma linha de texto abaixo de uma seção Markdown específica (H2).
   *
   * @param {object} app - Instância global do Obsidian App.
   * @param {object} file - Objeto TFile do Obsidian.
   * @param {string} nomeSecao - Nome do cabeçalho H2 alvo (ex: 'Hábitos', 'Tarefas').
   * @param {string} novaLinha - Conteúdo textual a ser inserido.
   * @returns {Promise<void>}
   */
  async adicionarLinhaEmSecao(app, file, nomeSecao, novaLinha) {
    if (!file) return;
    const raw = await app.vault.read(file);
    let updated = raw;
    const regexSecao = new RegExp(`(^##\\s+.*${nomeSecao}.*$)`, 'm');
    const match = updated.match(regexSecao);

    if (match) {
      updated = updated.replace(match[0], `${match[0]}\n${novaLinha}`);
    } else {
      updated += `\n\n## ${nomeSecao}\n${novaLinha}\n`;
    }
    await app.vault.modify(file, updated);
  },

  /**
   * Substitui linhas de um arquivo que atendam a uma condição lógica.
   *
   * @param {object} app - Instância global do Obsidian App.
   * @param {object} file - Objeto TFile do Obsidian.
   * @param {function(string): boolean} predicado - Função que retorna true para a linha alvo.
   * @param {function(string): string} transformador - Função que retorna a nova versão da linha.
   * @returns {Promise<void>}
   */
  async substituirLinha(app, file, predicado, transformador) {
    if (!file) return;
    const raw = await app.vault.read(file);
    const lines = raw.split('\n');
    let alterado = false;
    const newLines = lines.map(line => {
      if (predicado(line)) {
        alterado = true;
        return transformador(line);
      }
      return line;
    });
    if (alterado) {
      await app.vault.modify(file, newLines.join('\n'));
    }
  },

  /**
   * Remove linhas de um arquivo que atendam a um predicado.
   *
   * @param {object} app - Instância global do Obsidian App.
   * @param {object} file - Objeto TFile do Obsidian.
   * @param {function(string): boolean} predicado - Retorna true para as linhas a excluir.
   * @returns {Promise<void>}
   */
  async removerLinha(app, file, predicado) {
    if (!file) return;
    const raw = await app.vault.read(file);
    const lines = raw.split('\n');
    const newLines = lines.filter(line => !predicado(line));
    if (newLines.length !== lines.length) {
      await app.vault.modify(file, newLines.join('\n'));
    }
  },

  /**
   * Envia um arquivo para a lixeira do sistema de forma segura.
   *
   * @param {object} app - Instância global do Obsidian App.
   * @param {string} filePath - Caminho relativo do arquivo no Vault.
   * @returns {Promise<void>}
   */
  async excluirArquivo(app, filePath) {
    if (!filePath) return;
    const file = app.vault.getAbstractFileByPath(filePath);
    if (file) {
      await app.vault.trash(file, true);
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = VaultStore;
}

return VaultStore;


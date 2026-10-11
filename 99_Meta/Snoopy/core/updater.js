/**
 * Snoopy Vault - Microsserviço de Atualização Segura e Proteção de Integridade
 * Calcula planos de sincronização atômicos sem sobrescrever edições do usuário,
 * cria backups prévios e executa rollback total sob demanda.
 *
 * @module core/updater
 */
const Updater = {
  /**
   * Zonas permitidas para escrita pelo atualizador (Allowlist Estrita).
   * Impede que o motor toque em pastas de notas pessoais do usuário.
   */
  ALLOWLIST_PREFIXOS: [
    '99_Meta/Snoopy/',
    '.obsidian/snippets/05_Snoopy_Theme.css',
    '99_Meta/Templates/Tarefas/',
    '99_Meta/Templates/',
    '99_Meta/.backups/snoopy/'
  ],

  /**
   * Valida se um caminho pertence estritamente à zona do Motor autorizada.
   *
   * @private
   * @param {string} caminho - Caminho relativo do arquivo no vault.
   * @returns {boolean}
   */
  _validarCaminhoPermitido(caminho) {
    if (!caminho || typeof caminho !== 'string') return false;
    return this.ALLOWLIST_PREFIXOS.some(pref => caminho.startsWith(pref) || caminho === pref);
  },

  /**
   * Planeja a atualização comparando o manifesto remoto com o estado instalado
   * e o conteúdo real em disco, detectando arquivos editados pelo usuário para não sobrescrevê-los.
   *
   * @param {object} params
   * @param {object} params.manifestoRemoto - Manifesto com versão e hashes { motor: {}, seed: {} }.
   * @param {object|null} params.estadoInstalado - Histórico de instalação local { versao, arquivos: {} }.
   * @param {Object.<string, string>} [params.hashesLocais={}] - Hashes SHA-256 dos arquivos atualmente no disco.
   * @returns {{
   *   versaoAlvo: string,
   *   requerAtualizacao: boolean,
   *   adicionar: string[],
   *   atualizar: string[],
   *   preservar: Array<{ caminho: string, razao: string }>,
   *   remover: string[],
   *   iguais: string[]
   * }}
   */
  planejarAtualizacao({ manifestoRemoto, estadoInstalado, hashesLocais = {} }) {
    if (!manifestoRemoto || typeof manifestoRemoto !== 'object') {
      throw new Error('Manifesto remoto inválido ou não fornecido.');
    }

    const versaoAlvo = manifestoRemoto.versao || '0.0.0';
    const arquivosRemotos = (manifestoRemoto && manifestoRemoto.motor) || {};
    const arquivosInstalados = (estadoInstalado && estadoInstalado.arquivos) || {};

    const adicionar = [];
    const atualizar = [];
    const preservar = [];
    const iguais = [];
    const remover = [];

    // 1. Analisa todos os arquivos exigidos pelo motor remoto
    for (const [caminho, hashRemoto] of Object.entries(arquivosRemotos)) {
      if (!this._validarCaminhoPermitido(caminho)) {
        console.warn(`[Updater] Caminho remoto fora da allowlist ignorado por segurança: ${caminho}`);
        continue;
      }

      const hashLocal = hashesLocais[caminho];
      const hashOriginalInstalado = arquivosInstalados[caminho];

      if (!hashLocal) {
        adicionar.push(caminho);
      } else if (hashLocal === hashRemoto) {
        iguais.push(caminho);
      } else {
        if (hashOriginalInstalado && hashLocal !== hashOriginalInstalado) {
          preservar.push({
            caminho,
            razao: 'Arquivo customizado localmente pelo usuário.'
          });
        } else {
          atualizar.push(caminho);
        }
      }
    }

    // 2. Analisa arquivos do motor que foram descontinuados no manifesto remoto
    for (const caminho of Object.keys(arquivosInstalados)) {
      if (!arquivosRemotos[caminho] && hashesLocais[caminho] && this._validarCaminhoPermitido(caminho)) {
        remover.push(caminho);
      }
    }

    const requerAtualizacao = adicionar.length > 0 || atualizar.length > 0 || remover.length > 0;

    return {
      versaoAlvo,
      requerAtualizacao,
      adicionar,
      atualizar,
      preservar,
      remover,
      iguais
    };
  },

  /**
   * Aplica a atualização de forma atômica criando backup prévio, abortando sem efeitos colaterais
   * caso algum download falhe e preservando arquivos customizados como `.novo`.
   *
   * @param {object} app - Instância do Obsidian.
   * @param {object} params
   * @param {object} params.plano - Plano retornado por planejarAtualizacao.
   * @param {function(string): Promise<string>} params.baixarConteudo - Função que baixa o arquivo remoto.
   * @param {function(object): void} [params.aoProgredir] - Callback de progresso.
   * @returns {Promise<{ sucesso: boolean, idBackup: string, arquivosGravados: string[] }>}
   */
  async aplicarAtualizacao(app, { plano, baixarConteudo, aoProgredir }) {
    if (!app || !app.vault || !app.vault.adapter) {
      throw new Error('Instância do Obsidian Vault Adapter necessária.');
    }
    if (!plano || typeof plano !== 'object') {
      throw new Error('Plano de atualização não fornecido.');
    }
    if (typeof baixarConteudo !== 'function') {
      throw new Error('Função de download remoto obrigatória.');
    }

    const adapter = app.vault.adapter;
    const todosParaBaixar = [
      ...plano.adicionar,
      ...plano.atualizar,
      ...(plano.preservar ? plano.preservar.map(p => p.caminho) : [])
    ];

    // ETAPA 1: Pré-download completo em memória (se um falhar, nada em disco é tocado!)
    const bufferDownload = {};
    for (let i = 0; i < todosParaBaixar.length; i++) {
      const caminho = todosParaBaixar[i];
      if (typeof aoProgredir === 'function') {
        aoProgredir({ fase: 'download', atual: i + 1, total: todosParaBaixar.length, caminho });
      }
      bufferDownload[caminho] = await baixarConteudo(caminho);
    }

    // ETAPA 2: Criação do Backup Atômico com timestamp
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const idBackup = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const backupDir = `99_Meta/.backups/snoopy/${idBackup}`;

    const arquivosParaBackup = [
      ...plano.atualizar,
      ...plano.remover,
      ...(plano.preservar ? plano.preservar.map(p => p.caminho) : [])
    ];

    for (const caminho of arquivosParaBackup) {
      const existe = await adapter.exists(caminho);
      if (existe) {
        const conteudo = await adapter.read(caminho);
        const destinoBackup = `${backupDir}/${caminho}`;
        await this._garantirPasta(adapter, destinoBackup);
        await adapter.write(destinoBackup, conteudo);
      }
    }

    // ETAPA 3: Aplicação dos arquivos no cofre
    const arquivosGravados = [];

    // Arquivos novos e atualizados normalmente
    for (const caminho of [...plano.adicionar, ...plano.atualizar]) {
      const conteudo = bufferDownload[caminho];
      await this._garantirPasta(adapter, caminho);
      await adapter.write(caminho, conteudo);
      arquivosGravados.push(caminho);
    }

    // Arquivos preservados: grava ao lado com extensão .novo para auditoria visual
    if (Array.isArray(plano.preservar)) {
      for (const item of plano.preservar) {
        const caminhoNovo = `${item.caminho}.novo`;
        const conteudo = bufferDownload[item.caminho];
        if (conteudo) {
          await this._garantirPasta(adapter, caminhoNovo);
          await adapter.write(caminhoNovo, conteudo);
          arquivosGravados.push(caminhoNovo);
        }
      }
    }

    // Arquivos descontinuados: remove após salvar em backup
    for (const caminho of plano.remover) {
      const existe = await adapter.exists(caminho);
      if (existe && typeof adapter.remove === 'function') {
        await adapter.remove(caminho);
      }
    }

    return {
      sucesso: true,
      idBackup,
      arquivosGravados
    };
  },

  /**
   * Restaura o estado anterior do cofre a partir de um backup específico.
   *
   * @param {object} app - Instância do Obsidian.
   * @param {string} idBackup - Identificador/pasta do backup a ser restaurado.
   * @returns {Promise<{ sucesso: boolean, arquivosRestaurados: string[] }>}
   */
  async desfazerAtualizacao(app, idBackup) {
    if (!app || !app.vault || !app.vault.adapter) {
      throw new Error('Instância do Obsidian Vault Adapter necessária.');
    }
    const adapter = app.vault.adapter;
    const backupDir = `99_Meta/.backups/snoopy/${idBackup}`;

    const existeBackup = await adapter.exists(backupDir);
    if (!existeBackup) {
      throw new Error(`Backup "${idBackup}" não encontrado em ${backupDir}.`);
    }

    const arquivosRestaurados = [];
    const arquivosBackup = await this._listarArquivosRecursivo(adapter, backupDir);

    for (const arquivoCompleto of arquivosBackup) {
      // Extrai o caminho original removendo o prefixo do backup
      const caminhoOriginal = arquivoCompleto.replace(`${backupDir}/`, '');
      const conteudo = await adapter.read(arquivoCompleto);
      await this._garantirPasta(adapter, caminhoOriginal);
      await adapter.write(caminhoOriginal, conteudo);
      arquivosRestaurados.push(caminhoOriginal);
    }

    return {
      sucesso: true,
      arquivosRestaurados
    };
  },

  /**
   * Coleta todos os arquivos sob uma pasta de forma recursiva.
   *
   * @private
   * @param {object} adapter - Obsidian Vault Adapter.
   * @param {string} dir - Diretório base.
   * @returns {Promise<string[]>}
   */
  async _listarArquivosRecursivo(adapter, dir) {
    let resultado = [];
    try {
      const listRes = await adapter.list(dir);
      if (Array.isArray(listRes.files)) {
        resultado.push(...listRes.files);
      }
      if (Array.isArray(listRes.folders)) {
        for (const sub of listRes.folders) {
          const subFiles = await this._listarArquivosRecursivo(adapter, sub);
          resultado.push(...subFiles);
        }
      }
    } catch(e) {}
    return resultado;
  },

  /**
   * Garante a criação dos diretórios pais antes de gravar um arquivo.
   *
   * @private
   */
  async _garantirPasta(adapter, caminhoArquivo) {
    const partes = caminhoArquivo.split('/');
    partes.pop();
    if (partes.length === 0) return;
    const pasta = partes.join('/');
    const existe = await adapter.exists(pasta);
    if (!existe && typeof adapter.mkdir === 'function') {
      await adapter.mkdir(pasta).catch(() => {});
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Updater;
}

return Updater;

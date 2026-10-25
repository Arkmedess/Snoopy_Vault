/**
 * Snoopy Vault - Gerenciador de Economia e Inventário Botânico (Jardim & Loja)
 * Gerencia o saldo de moedas de sol/seiva obtidas através de sessões de foco,
 * o inventário de árvores desbloqueadas e a seleção da espécie em cultivo.
 *
 * @module core/jardim_store
 */

const CAMINHO_STORE = '99_Meta/jardim-constancia.json';

const CATALOGO_LOJA = [
  {
    id: 'sprout',
    nome: 'Brotinho Verdejante',
    categoria: 'Inicial',
    preco: 0,
    iconName: 'sprout',
    cor: '#86efac',
    lore: 'Toda grande floresta começa com um simples broto buscando o sol.',
    beneficio: 'Espécie nativa inicial de foco'
  },
  {
    id: 'flower-2',
    nome: 'Cerejeira Sakura',
    categoria: 'Árvore Floral',
    preco: 50,
    iconName: 'flower-2',
    cor: '#f472b6',
    lore: 'Tome um gole de Matcha e aprecie as flores da sua disciplina diária.',
    beneficio: 'Floresce em sessões calmas e meditativas'
  },
  {
    id: 'tree-pine',
    nome: 'Pinheiro Alpino',
    categoria: 'Resistente',
    preco: 100,
    iconName: 'tree-pine',
    cor: '#4ade80',
    lore: 'Raízes profundas no solo rochoso. Imune a qualquer tempestade de distrações.',
    beneficio: 'Símbolo de foco prolongado e ininterrupto'
  },
  {
    id: 'sparkles',
    nome: 'Árvore Estelar',
    categoria: 'Mística',
    preco: 200,
    iconName: 'sparkles',
    cor: '#facc15',
    lore: 'Se uma estrela cadente realiza um desejo, que tal cultivar um céu estrelado em sua copa?',
    beneficio: 'Ilumina o bosque com partículas douradas'
  },
  {
    id: 'library',
    nome: 'Bonsai Filosófico',
    categoria: 'Sabedoria',
    preco: 300,
    iconName: 'library',
    cor: '#38bdf8',
    lore: 'Cultivado com a serenidade de séculos de leitura e reflexão estoica.',
    beneficio: 'Ideal para sessões de estudos densos'
  },
  {
    id: 'trees',
    nome: 'Floresta Mágica Ancestral',
    categoria: 'Mestre',
    preco: 500,
    iconName: 'trees',
    cor: '#a78bfa',
    lore: 'O ápice da constância. Um bioma sagrado de máxima produtividade.',
    beneficio: 'Consagra seu status como Mestre do Foco'
  }
];

const JardimStore = {
  CATALOGO: CATALOGO_LOJA,

  /**
   * Retorna o estado padrão da economia botânica.
   */
  obterEstadoPadrao() {
    return {
      moedas: 0,
      arvoreAtiva: 'sprout',
      desbloqueadas: ['sprout'],
      totalPlantadas: 0,
      historicoCompras: []
    };
  },

  /**
   * Lê o estado da economia do cofre.
   *
   * @param {object} app - Instância do Obsidian.
   * @returns {Promise<object>}
   */
  async carregar(app) {
    if (!app || !app.vault) return this.obterEstadoPadrao();
    try {
      const file = app.vault.getAbstractFileByPath(CAMINHO_STORE);
      if (file) {
        const conteudo = await app.vault.read(file);
        const parsed = JSON.parse(conteudo);
        return {
          ...this.obterEstadoPadrao(),
          ...parsed,
          desbloqueadas: Array.isArray(parsed.desbloqueadas) ? parsed.desbloqueadas : ['sprout']
        };
      }
    } catch (e) {
      console.warn('[JardimStore] Falha ao ler store, usando padrão:', e);
    }
    return this.obterEstadoPadrao();
  },

  /**
   * Salva o estado da economia no cofre.
   *
   * @param {object} app - Instância do Obsidian.
   * @param {object} estado - Dados da economia.
   */
  async salvar(app, estado) {
    if (!app || !app.vault) return;
    try {
      const jsonStr = JSON.stringify(estado, null, 2);
      const file = app.vault.getAbstractFileByPath(CAMINHO_STORE);
      if (file) {
        await app.vault.modify(file, jsonStr);
      } else if (typeof app.vault.create === 'function') {
        await app.vault.create(CAMINHO_STORE, jsonStr);
      }
    } catch (e) {
      console.error('[JardimStore] Falha ao salvar estado:', e);
    }
  },

  /**
   * Credita moedas ganhas por tempo de foco concluído (1 moeda a cada 5m)
   * com bônus acumulativo por combo de ciclos seguidos sem interrupção.
   *
   * @param {object} app - Instância do Obsidian.
   * @param {number} [minutos=25] - Duração do foco em minutos.
   * @param {number} [comboCiclos=1] - Sequência de ciclos contínuos sem pausa abandonada.
   * @returns {Promise<{ moedasGanhas: number, base: number, bonusCombo: number, combo: number, saldoAtual: number }>}
   */
  async creditarFoco(app, minutos = 25, comboCiclos = 1) {
    const estado = await this.carregar(app);
    const m = Math.max(0, Number(minutos) || 25);
    const base = Math.max(1, Math.floor(m / 5));

    const combo = Math.max(1, Number(comboCiclos) || 1);
    let bonusCombo = 0;
    if (combo >= 10) {
      bonusCombo = 3;
    } else if (combo >= 5) {
      bonusCombo = 2;
    } else if (combo >= 3) {
      bonusCombo = 1;
    }

    const ganho = base + bonusCombo;
    estado.moedas = (Number(estado.moedas) || 0) + ganho;
    estado.totalPlantadas = (Number(estado.totalPlantadas) || 0) + 1;
    await this.salvar(app, estado);
    return {
      moedasGanhas: ganho,
      base,
      bonusCombo,
      combo,
      saldoAtual: estado.moedas
    };
  },

  /**
   * Compra/desbloqueia uma nova espécie botânica da loja.
   *
   * @param {object} app - Instância do Obsidian.
   * @param {string} idArvore - Identificador da árvore no catálogo.
   * @returns {Promise<{ sucesso: boolean, mensagem: string, estado: object }>}
   */
  async comprarArvore(app, idArvore) {
    const item = CATALOGO_LOJA.find(c => c.id === idArvore);
    if (!item) {
      return { sucesso: false, mensagem: 'Espécie não encontrada no catálogo.' };
    }

    const estado = await this.carregar(app);
    if (estado.desbloqueadas.includes(idArvore)) {
      return { sucesso: false, mensagem: 'Esta espécie já foi desbloqueada!', estado };
    }

    if (estado.moedas < item.preco) {
      const faltam = item.preco - estado.moedas;
      return { sucesso: false, mensagem: `Moedas insuficientes. Faltam ${faltam} moedas de foco.`, estado };
    }

    estado.moedas -= item.preco;
    estado.desbloqueadas.push(idArvore);
    estado.arvoreAtiva = idArvore; // equipa automaticamente ao comprar
    estado.historicoCompras.push({
      id: idArvore,
      preco: item.preco,
      data: new Date().toISOString()
    });

    await this.salvar(app, estado);
    return {
      sucesso: true,
      mensagem: `🎉 ${item.nome} desbloqueada com sucesso! Agora disponível para cultivo.`,
      estado
    };
  },

  /**
   * Seleciona uma árvore já desbloqueada para cultivo ativo no timer.
   *
   * @param {object} app - Instância do Obsidian.
   * @param {string} idArvore - Identificador da árvore.
   * @returns {Promise<{ sucesso: boolean, estado: object }>}
   */
  async selecionarArvore(app, idArvore) {
    const estado = await this.carregar(app);
    if (!estado.desbloqueadas.includes(idArvore)) {
      return { sucesso: false, mensagem: 'Espécie bloqueada. Compre na loja primeiro.', estado };
    }

    estado.arvoreAtiva = idArvore;
    await this.salvar(app, estado);
    return { sucesso: true, estado };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = JardimStore;
}

return JardimStore;

/**
 * Snoopy Vault - Gerenciador de Economia e Inventário Botânico (Jardim & Loja)
 * Fachada de compatibilidade retroativa delegando a gestão financeira e de inventário para ShopStore.
 *
 * @module core/jardim_store
 */

let ShopStore = null;
try {
  ShopStore = require('./shop_store.js');
} catch (_) {
  if (typeof window !== 'undefined' && window.ShopStore) {
    ShopStore = window.ShopStore;
  }
}

const JardimStore = {
  /**
   * Catálogo de espécies botânicas disponível para o jardim.
   */
  get CATALOGO() {
    if (ShopStore && typeof ShopStore.obterCatalogo === 'function') {
      return ShopStore.obterCatalogo('botanical').map(item => ({
        ...item,
        categoria: item.subtipo || item.categoria
      }));
    }
    return [];
  },

  /**
   * Retorna o estado padrão legado da economia botânica.
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
   * Converte a estrutura canônica de ShopStore para a assinatura legada de JardimStore.
   * Filtra defensivamente elementos anômalos (null, numbers, non-strings) para evitar TypeErrors.
   *
   * @private
   * @param {object} estadoShop - Estado bruto ou normalizado do ShopStore.
   * @returns {object} Estado formatado na assinatura legada do JardimStore.
   */
  _formatarEstadoLegado(estadoShop) {
    if (!estadoShop || typeof estadoShop !== 'object') return this.obterEstadoPadrao();

    const desbloqueadosRaw = Array.isArray(estadoShop.desbloqueados)
      ? estadoShop.desbloqueados
      : [];

    const desbloqueadasBotanicas = desbloqueadosRaw
      .filter(id => typeof id === 'string' && id.trim().length > 0)
      .filter(id => {
        const item = (ShopStore && typeof ShopStore.obterItemPorId === 'function')
          ? ShopStore.obterItemPorId(id)
          : null;
        if (item) return item.categoria === 'botanical';
        return !id.startsWith('audio-') && !id.startsWith('theme-');
      });

    const historicoRaw = Array.isArray(estadoShop.historicoTransacoes)
      ? estadoShop.historicoTransacoes
      : [];

    const historicoCompras = historicoRaw
      .filter(t => t && typeof t === 'object' && t.tipo === 'compra_item')
      .filter(t => {
        if (!t.itemId) return true;
        if (typeof t.itemId !== 'string') return false;
        return !t.itemId.startsWith('audio-') && !t.itemId.startsWith('theme-');
      })
      .map(t => ({
        id: t.itemId,
        preco: Number.isFinite(Number(t.valor)) ? Math.max(0, Math.floor(Number(t.valor))) : 0,
        data: typeof t.dataIso === 'string' ? t.dataIso : new Date().toISOString()
      }));

    const saldoNum = Number(estadoShop.saldo);
    const saldoValido = (!Number.isNaN(saldoNum) && Number.isFinite(saldoNum))
      ? Math.max(0, Math.floor(saldoNum))
      : 0;

    const arvoreAtiva = (estadoShop.equipados && typeof estadoShop.equipados.botanical === 'string' && estadoShop.equipados.botanical.trim().length > 0)
      ? estadoShop.equipados.botanical
      : 'sprout';

    const totalPlantadasNum = estadoShop.estatisticasBotanicas ? Number(estadoShop.estatisticasBotanicas.totalPlantadas) : 0;
    const totalPlantadas = (!Number.isNaN(totalPlantadasNum) && Number.isFinite(totalPlantadasNum))
      ? Math.max(0, Math.floor(totalPlantadasNum))
      : 0;

    return {
      moedas: saldoValido,
      arvoreAtiva,
      desbloqueadas: desbloqueadasBotanicas.length > 0 ? desbloqueadasBotanicas : ['sprout'],
      totalPlantadas,
      historicoCompras
    };
  },

  /**
   * Lê o estado da economia através de ShopStore e projeta no formato legado.
   *
   * @param {object} app - Instância do Obsidian.
   * @returns {Promise<object>}
   */
  async carregar(app) {
    if (ShopStore && typeof ShopStore.carregar === 'function') {
      const estadoShop = await ShopStore.carregar(app);
      return this._formatarEstadoLegado(estadoShop);
    }
    return this.obterEstadoPadrao();
  },

  /**
   * Salva o estado da economia no cofre através de ShopStore.
   *
   * @param {object} app - Instância do Obsidian.
   * @param {object} estado - Dados da economia no formato legado.
   */
  async salvar(app, estado) {
    if (!ShopStore || typeof ShopStore.carregar !== 'function') return;

    const salvarInterno = async () => {
      const estadoShop = await ShopStore.carregar(app);
      if (estado && typeof estado === 'object') {
        if (estado.moedas !== undefined) {
          const moedasNum = Number(estado.moedas);
          estadoShop.saldo = (!Number.isNaN(moedasNum) && Number.isFinite(moedasNum))
            ? Math.max(0, Math.floor(moedasNum))
            : 0;
        }
        if (estado.arvoreAtiva && typeof estado.arvoreAtiva === 'string') {
          if (!estadoShop.equipados) estadoShop.equipados = {};
          estadoShop.equipados.botanical = estado.arvoreAtiva;
        }
        if (Array.isArray(estado.desbloqueadas)) {
          const desbloqueadasValidas = estado.desbloqueadas.filter(id => typeof id === 'string' && id.trim().length > 0);
          const setDesb = new Set([...(estadoShop.desbloqueados || []), ...desbloqueadasValidas]);
          estadoShop.desbloqueados = [...setDesb];
        }
        if (estado.totalPlantadas !== undefined) {
          const plantadasNum = Number(estado.totalPlantadas);
          if (!estadoShop.estatisticasBotanicas) estadoShop.estatisticasBotanicas = {};
          estadoShop.estatisticasBotanicas.totalPlantadas = (!Number.isNaN(plantadasNum) && Number.isFinite(plantadasNum))
            ? Math.max(0, Math.floor(plantadasNum))
            : 0;
        }
      }

      await ShopStore.salvar(app, estadoShop);
    };

    if (typeof ShopStore.executarSerializado === 'function') {
      return ShopStore.executarSerializado(app, salvarInterno);
    }
    return salvarInterno();
  },

  /**
   * Retorna o saldo síncrono de moedas através de ShopStore.
   *
   * @param {object} app
   * @returns {number}
   */
  obterSaldo(app) {
    if (ShopStore && typeof ShopStore.obterSaldo === 'function') {
      return ShopStore.obterSaldo(app);
    }
    return 0;
  },

  /**
   * Credita moedas na conta do usuário através de ShopStore.
   */
  async creditarMoedas(app, quantidade, motivo = 'foco_pomodoro', eventBus = null) {
    if (ShopStore && typeof ShopStore.creditarMoedas === 'function') {
      return await ShopStore.creditarMoedas(app, quantidade, motivo, eventBus);
    }
    return 0;
  },

  /**
   * Credita moedas por tempo de foco através de ShopStore.
   *
   * @param {object} app - Instância do Obsidian.
   * @param {number} [minutos=25] - Duração do foco em minutos.
   * @param {number} [comboCiclos=1] - Sequência de ciclos contínuos sem pausa abandonada.
   * @returns {Promise<{ moedasGanhas: number, base: number, bonusCombo: number, combo: number, saldoAtual: number }>}
   */
  async creditarFoco(app, minutos = 25, comboCiclos = 1) {
    if (ShopStore && typeof ShopStore.creditarFoco === 'function') {
      return await ShopStore.creditarFoco(app, minutos, comboCiclos);
    }
    return {
      moedasGanhas: 5,
      base: 5,
      bonusCombo: 0,
      combo: 1,
      saldoAtual: 5
    };
  },

  /**
   * Compra/desbloqueia uma nova espécie botânica através de ShopStore.
   * Valida rigorosamente que o identificador pertence ao catálogo botânico
   * antes de debitar moedas ou delegar ao ShopStore.
   *
   * @param {object} app - Instância do Obsidian.
   * @param {string} idArvore - Identificador da árvore no catálogo.
   * @returns {Promise<{ sucesso: boolean, mensagem: string, estado: object }>}
   */
  async comprarArvore(app, idArvore) {
    if (!idArvore || typeof idArvore !== 'string') {
      return {
        sucesso: false,
        mensagem: 'Espécie não encontrada no catálogo botânico.',
        estado: await this.carregar(app)
      };
    }

    const item = (ShopStore && typeof ShopStore.obterItemPorId === 'function')
      ? ShopStore.obterItemPorId(idArvore)
      : null;

    if (!item || item.categoria !== 'botanical') {
      return {
        sucesso: false,
        mensagem: 'Espécie não encontrada no catálogo botânico.',
        estado: await this.carregar(app)
      };
    }

    if (ShopStore && typeof ShopStore.comprarItem === 'function') {
      const res = await ShopStore.comprarItem(app, idArvore);
      const estadoLegado = res.estado ? this._formatarEstadoLegado(res.estado) : await this.carregar(app);
      return {
        sucesso: res.sucesso,
        mensagem: res.mensagem,
        estado: estadoLegado
      };
    }

    return {
      sucesso: false,
      mensagem: 'ShopStore indisponível.',
      estado: await this.carregar(app)
    };
  },

  /**
   * Seleciona uma árvore já desbloqueada para cultivo ativo no timer através de ShopStore.
   * Valida que o identificador pertence ao catálogo botânico e que a espécie já foi desbloqueada.
   *
   * @param {object} app - Instância do Obsidian.
   * @param {string} idArvore - Identificador da árvore.
   * @returns {Promise<{ sucesso: boolean, mensagem: string, estado: object }>}
   */
  async selecionarArvore(app, idArvore) {
    if (!idArvore || typeof idArvore !== 'string') {
      return {
        sucesso: false,
        mensagem: 'Espécie não encontrada no catálogo botânico.',
        estado: await this.carregar(app)
      };
    }

    const item = (ShopStore && typeof ShopStore.obterItemPorId === 'function')
      ? ShopStore.obterItemPorId(idArvore)
      : null;

    if (!item || item.categoria !== 'botanical') {
      return {
        sucesso: false,
        mensagem: 'Espécie não encontrada no catálogo botânico.',
        estado: await this.carregar(app)
      };
    }

    const estadoAtual = await this.carregar(app);
    if (!estadoAtual.desbloqueadas || !estadoAtual.desbloqueadas.includes(idArvore)) {
      return {
        sucesso: false,
        mensagem: 'Item bloqueado. Compre na loja primeiro.',
        estado: estadoAtual
      };
    }

    if (ShopStore && typeof ShopStore.equiparItem === 'function') {
      const res = await ShopStore.equiparItem(app, idArvore);
      const estadoLegado = res.estado ? this._formatarEstadoLegado(res.estado) : estadoAtual;
      return {
        sucesso: res.sucesso,
        mensagem: res.mensagem,
        estado: estadoLegado
      };
    }

    return {
      sucesso: false,
      mensagem: 'ShopStore indisponível.',
      estado: estadoAtual
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = JardimStore;
}
if (typeof window !== 'undefined') {
  window.JardimStore = JardimStore;
}

return JardimStore;

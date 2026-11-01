/**
 * Snoopy Vault - Central de Economia, Catálogo & Inventário Autônomo (ShopStore)
 * Gerencia catálogo multi-categoria (botânica, áudio de foco, personalização cosmética),
 * saldo de moedas de foco, desbloqueios e itens equipados de forma desacoplada do jardim.
 *
 * @module core/shop_store
 */

const CAMINHO_STORE = '99_Meta/snoopy-shop.json';
const CAMINHO_STORE_LEGADO = '99_Meta/jardim-constancia.json';

const CATALOGO_LOJA = [
  // --- BOTÂNICA (6 itens) ---
  {
    id: 'sprout',
    nome: 'Brotinho Verdejante',
    categoria: 'botanical',
    subtipo: 'Inicial',
    preco: 0,
    iconName: 'sprout',
    cor: '#86efac',
    lore: 'Toda grande floresta começa com um simples broto buscando o sol.',
    beneficio: 'Espécie nativa inicial de foco'
  },
  {
    id: 'flower-2',
    nome: 'Cerejeira Sakura',
    categoria: 'botanical',
    subtipo: 'Árvore Floral',
    preco: 50,
    iconName: 'flower-2',
    cor: '#f472b6',
    lore: 'Tome um gole de Matcha e aprecie as flores da sua disciplina diária.',
    beneficio: 'Floresce em sessões calmas e meditativas'
  },
  {
    id: 'tree-pine',
    nome: 'Pinheiro Alpino',
    categoria: 'botanical',
    subtipo: 'Resistente',
    preco: 100,
    iconName: 'tree-pine',
    cor: '#4ade80',
    lore: 'Raízes profundas no solo rochoso. Imune a qualquer tempestade de distrações.',
    beneficio: 'Símbolo de foco prolongado e ininterrupto'
  },
  {
    id: 'sparkles',
    nome: 'Árvore Estelar',
    categoria: 'botanical',
    subtipo: 'Mística',
    preco: 200,
    iconName: 'sparkles',
    cor: '#facc15',
    lore: 'Se uma estrela cadente realiza um desejo, que tal cultivar um céu estrelado em sua copa?',
    beneficio: 'Ilumina o bosque com partículas douradas'
  },
  {
    id: 'library',
    nome: 'Bonsai Filosófico',
    categoria: 'botanical',
    subtipo: 'Sabedoria',
    preco: 300,
    iconName: 'library',
    cor: '#38bdf8',
    lore: 'Cultivado com a serenidade de séculos de leitura e reflexão estoica.',
    beneficio: 'Ideal para sessões de estudos densos'
  },
  {
    id: 'trees',
    nome: 'Floresta Mágica Ancestral',
    categoria: 'botanical',
    subtipo: 'Mestre',
    preco: 500,
    iconName: 'trees',
    cor: '#a78bfa',
    lore: 'O ápice da constância. Um bioma sagrado de máxima produtividade.',
    beneficio: 'Consagra seu status como Mestre do Foco'
  },

  // --- ÁUDIOS DE FOCO PROCEDURAIS (6 itens) ---
  {
    id: 'audio-white-noise',
    nome: 'Ruído Branco Puro',
    categoria: 'audio',
    subtipo: 'Ruído Estocástico',
    preco: 0,
    iconName: 'volume-2',
    cor: '#86efac',
    lore: 'Mascaramento acústico uniforme em todo o espectro de frequências audíveis.',
    beneficio: 'Silencia distrações sonoras imprevisíveis do ambiente',
    config: { trackId: 'white_noise', tipo: 'buffer' }
  },
  {
    id: 'audio-pink-noise',
    nome: 'Ruído Rosa Relaxante',
    categoria: 'audio',
    subtipo: 'Ruído Balanceado',
    preco: 40,
    iconName: 'volume-1',
    cor: '#f472b6',
    lore: 'Densidade espectral balanceada com atenuação suave de 3dB por oitava.',
    beneficio: 'Ideal para leitura densa, escrita e relaxamento sereno',
    config: { trackId: 'pink_noise', tipo: 'buffer' }
  },
  {
    id: 'audio-brown-noise',
    nome: 'Ruído Marrom Profundo',
    categoria: 'audio',
    subtipo: 'Grave Aveludado',
    preco: 80,
    iconName: 'headphones',
    cor: '#ca8a04',
    lore: 'Atenuação profunda de 6dB por oitava gerando graves cálidos e contínuos.',
    beneficio: 'Flow profundo e imersão contra pensamentos acelerados',
    config: { trackId: 'brown_noise', tipo: 'buffer' }
  },
  {
    id: 'audio-procedural-rain',
    nome: 'Chuva Zen Procedural',
    categoria: 'audio',
    subtipo: 'Clima Dinâmico',
    preco: 120,
    iconName: 'cloud-rain',
    cor: '#38bdf8',
    lore: 'Gotas geradas estocasticamente sobre um leito sutil de ruído rosa.',
    beneficio: 'Atmosfera meditativa reconfortante para longas sessões de estudo',
    config: { trackId: 'procedural_rain', tipo: 'buffer' }
  },
  {
    id: 'audio-binaural-alpha',
    nome: 'Ondas Alfa 10Hz',
    categoria: 'audio',
    subtipo: 'Batimento Binaural',
    preco: 150,
    iconName: 'music',
    cor: '#a78bfa',
    lore: 'Batimento estéreo de 10 Hz estimulando alerta sereno e retenção mnemônica.',
    beneficio: 'Excelente para revisões espaçadas e consolidação de memória',
    config: { trackId: 'binaural_alpha', tipo: 'oscillator', freqL: 200, freqR: 210 }
  },
  {
    id: 'audio-binaural-beta',
    nome: 'Ondas Beta 16Hz',
    categoria: 'audio',
    subtipo: 'Batimento Binaural',
    preco: 180,
    iconName: 'sparkles',
    cor: '#fbbf24',
    lore: 'Pulsos de 16 Hz gerados para foco analítico, velocidade mental e resolução lógica.',
    beneficio: 'Máxima performance em matemática, programação e raciocínio denso',
    config: { trackId: 'binaural_beta', tipo: 'oscillator', freqL: 200, freqR: 216 }
  },

  // --- CUSTOMIZAÇÕES COSMÉTICAS (4 itens) ---
  {
    id: 'theme-preset-snoopy',
    nome: 'Obsidian Classic Dark',
    categoria: 'cosmetic',
    subtipo: 'Tema Padrão',
    preco: 0,
    iconName: 'layout',
    cor: '#86efac',
    lore: 'A sobriedade definitiva do Snoopy Vault com acentos em verde menta técnico.',
    beneficio: 'Visual escuro de alto contraste nativo do sistema',
    config: { acento: '#86efac' }
  },
  {
    id: 'theme-preset-cyber',
    nome: 'Cyber Minimalist',
    categoria: 'cosmetic',
    subtipo: 'Acento Cirúrgico',
    preco: 150,
    iconName: 'terminal',
    cor: '#38bdf8',
    lore: 'Linhas precisas e acentos em azul ciano neon cirúrgico para foco tecnológico.',
    beneficio: 'Destaque ciano brilhante para timers e badges de estatística',
    config: { acento: '#38bdf8' }
  },
  {
    id: 'theme-preset-solar',
    nome: 'Solar Amber',
    categoria: 'cosmetic',
    subtipo: 'Acento Cálido',
    preco: 200,
    iconName: 'sun',
    cor: '#fbbf24',
    lore: 'Tons quentes de âmbar e ouro técnico inspirados na luz do amanhecer produtivo.',
    beneficio: 'Acento solar dourado para botões e anéis de progresso',
    config: { acento: '#fbbf24' }
  },
  {
    id: 'theme-preset-rose',
    nome: 'Velvet Sakura',
    categoria: 'cosmetic',
    subtipo: 'Acento Aveludado',
    preco: 250,
    iconName: 'flower-2',
    cor: '#f472b6',
    lore: 'Delicadeza estética com paleta pastel suave de flores de cerejeira orientais.',
    beneficio: 'Acentos em rosa suave para dial e bordas aveludadas',
    config: { acento: '#f472b6' }
  }
];

let cachePorApp = new WeakMap();
let filaExecucaoPorApp = new WeakMap();

/**
 * Executa uma operação assíncrona serializada por instância de app usando fila em cadeia de Promises.
 * Garante exclusão mútua e atomicidade lógica para operações mutadoras de estado.
 *
 * @param {object} app - Instância do Obsidian App (chave do WeakMap).
 * @param {() => Promise<any>} operacaoAsync - Função que executa a transação.
 * @returns {Promise<any>}
 */
function executarSerializado(app, operacaoAsync) {
  if (!app || typeof app !== 'object') {
    return Promise.resolve().then(operacaoAsync);
  }

  const filaAtual = filaExecucaoPorApp.get(app) || Promise.resolve();
  const proximaFila = filaAtual
    .catch(() => {})
    .then(() => operacaoAsync());

  filaExecucaoPorApp.set(app, proximaFila.catch(() => {}));
  return proximaFila;
}

const ShopStore = {
  executarSerializado,
  CAMINHO_STORE,
  CAMINHO_STORE_LEGADO,
  CATALOGO: CATALOGO_LOJA,

  /**
   * Retorna os itens do catálogo, opcionalmente filtrados por categoria.
   *
   * @param {'botanical'|'audio'|'cosmetic'|null} [categoria=null]
   * @returns {Array<object>}
   */
  obterCatalogo(categoria = null) {
    if (!categoria) return [...CATALOGO_LOJA];
    return CATALOGO_LOJA.filter(i => i.categoria === categoria);
  },

  /**
   * Busca um item específico do catálogo pelo seu identificador único.
   *
   * @param {string} itemId
   * @returns {object|null}
   */
  obterItemPorId(itemId) {
    return CATALOGO_LOJA.find(i => i.id === itemId) || null;
  },

  /**
   * Retorna o estado padrão canônico da loja (schema v1).
   *
   * @returns {object}
   */
  obterEstadoPadrao() {
    return {
      versao: 1,
      saldo: 0,
      totalGanhosHistoricos: 0,
      desbloqueados: ['sprout', 'audio-white-noise', 'theme-preset-snoopy'],
      equipados: {
        botanical: 'sprout',
        audio: 'audio-white-noise',
        cosmetic: 'theme-preset-snoopy'
      },
      estatisticasBotanicas: {
        totalPlantadas: 0
      },
      historicoTransacoes: []
    };
  },

  /**
   * Normaliza dados brutos lidos de arquivo (seja v1 ou legado) para o esquema padrão.
   * @private
   */
  _normalizarEstado(raw) {
    const padrao = this.obterEstadoPadrao();
    if (!raw || typeof raw !== 'object') return padrao;

    const saldoRaw = (raw.saldo !== undefined && raw.saldo !== null)
      ? raw.saldo
      : raw.moedas;
    const saldoNum = Number(saldoRaw);
    const saldo = (saldoRaw !== undefined && saldoRaw !== null && !Number.isNaN(saldoNum) && Number.isFinite(saldoNum))
      ? Math.max(0, Math.floor(saldoNum))
      : 0;

    let totalGanhosHistoricos = saldo;
    if (raw.totalGanhosHistoricos !== undefined && raw.totalGanhosHistoricos !== null) {
      const totNum = Number(raw.totalGanhosHistoricos);
      if (!Number.isNaN(totNum) && Number.isFinite(totNum)) {
        totalGanhosHistoricos = Math.max(saldo, Math.floor(totNum));
      }
    }

    const desbloqueadosRaw = (Array.isArray(raw.desbloqueados)
      ? raw.desbloqueados
      : (Array.isArray(raw.desbloqueadas) ? raw.desbloqueadas : []))
      .filter(id => typeof id === 'string' && id.trim().length > 0)
      .map(id => id.trim());

    const desbloqueados = [...new Set([...padrao.desbloqueados, ...desbloqueadosRaw])];

    const equipados = {
      botanical: (raw.equipados && typeof raw.equipados.botanical === 'string' && raw.equipados.botanical.trim().length > 0)
        ? raw.equipados.botanical.trim()
        : ((typeof raw.arvoreAtiva === 'string' && raw.arvoreAtiva.trim().length > 0) ? raw.arvoreAtiva.trim() : 'sprout'),
      audio: (raw.equipados && typeof raw.equipados.audio === 'string' && raw.equipados.audio.trim().length > 0)
        ? raw.equipados.audio.trim()
        : 'audio-white-noise',
      cosmetic: (raw.equipados && typeof raw.equipados.cosmetic === 'string' && raw.equipados.cosmetic.trim().length > 0)
        ? raw.equipados.cosmetic.trim()
        : 'theme-preset-snoopy'
    };

    const rawPlantadas = (raw.estatisticasBotanicas && raw.estatisticasBotanicas.totalPlantadas !== undefined && raw.estatisticasBotanicas.totalPlantadas !== null)
      ? raw.estatisticasBotanicas.totalPlantadas
      : raw.totalPlantadas;
    const numPlantadas = Number(rawPlantadas);
    const totalPlantadas = (rawPlantadas !== undefined && rawPlantadas !== null && !Number.isNaN(numPlantadas) && Number.isFinite(numPlantadas))
      ? Math.max(0, Math.floor(numPlantadas))
      : 0;

    const historicoTransacoes = Array.isArray(raw.historicoTransacoes)
      ? raw.historicoTransacoes.filter(t => t && typeof t === 'object')
      : (Array.isArray(raw.historicoCompras)
          ? raw.historicoCompras
              .filter(h => h && typeof h === 'object')
              .map((h, idx) => {
                const itemId = (h.id !== undefined && h.id !== null && String(h.id).trim().length > 0)
                  ? String(h.id).trim()
                  : 'desconhecido';
                const precoNum = Number(h.preco);
                const valor = (!Number.isNaN(precoNum) && Number.isFinite(precoNum)) ? Math.max(0, Math.floor(precoNum)) : 0;
                const dataIso = (typeof h.data === 'string' && h.data.trim().length > 0)
                  ? h.data
                  : new Date().toISOString();

                return {
                  id: `migracao_${itemId}_${Date.now()}_${idx}`,
                  tipo: 'compra_item',
                  itemId,
                  valor,
                  saldoResultante: saldo,
                  dataIso,
                  detalhes: { migrado: true }
                };
              })
          : []);

    return {
      versao: 1,
      saldo,
      totalGanhosHistoricos,
      desbloqueados,
      equipados,
      estatisticasBotanicas: { totalPlantadas },
      historicoTransacoes
    };
  },

  /**
   * Obtém o estado de forma síncrona através do cache de memória ou do mock de testes.
   * @private
   */
  _obterEstadoSincrono(app) {
    if (!app || typeof app !== 'object') return this.obterEstadoPadrao();
    if (cachePorApp.has(app)) return cachePorApp.get(app);

    // Suporte síncrono para testes automatizados via mock vault._getRawStore()
    if (app.vault && typeof app.vault._getRawStore === 'function') {
      try {
        const storeMap = app.vault._getRawStore();
        const rawShop = storeMap.get(CAMINHO_STORE);
        const rawLegado = storeMap.get(CAMINHO_STORE_LEGADO);
        const raw = rawShop || rawLegado;
        if (raw) {
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          const estado = this._normalizarEstado(parsed);
          cachePorApp.set(app, estado);
          return estado;
        }
      } catch (_) {
        // Fallback para estado padrão
      }
    }

    return this.obterEstadoPadrao();
  },

  /**
   * Lê o estado da loja a partir do cofre ou realiza migração do arquivo legado.
   *
   * @param {object} app - Instância do Obsidian App.
   * @returns {Promise<object>}
   */
  async carregar(app) {
    if (!app || !app.vault) return this.obterEstadoPadrao();

    try {
      const fileShop = app.vault.getAbstractFileByPath(CAMINHO_STORE);
      if (fileShop) {
        const conteudo = await app.vault.read(fileShop);
        const parsed = JSON.parse(conteudo);
        const estado = this._normalizarEstado(parsed);
        cachePorApp.set(app, estado);
        return estado;
      }

      // Migração automática a partir do arquivo legado se o shop store ainda não existir
      const fileLegado = app.vault.getAbstractFileByPath(CAMINHO_STORE_LEGADO);
      if (fileLegado) {
        const conteudoLegado = await app.vault.read(fileLegado);
        const parsedLegado = JSON.parse(conteudoLegado);
        const estadoMigrado = this._normalizarEstado(parsedLegado);
        await this.salvar(app, estadoMigrado);
        cachePorApp.set(app, estadoMigrado);
        return estadoMigrado;
      }
    } catch (e) {
      console.warn('[ShopStore] Falha ao ler store, inicializando padrão seguro:', e);
    }

    const padrao = this.obterEstadoPadrao();
    if (typeof app === 'object') {
      cachePorApp.set(app, padrao);
    }
    return padrao;
  },

  /**
   * Salva o estado da loja no cofre e atualiza o cache local.
   *
   * @param {object} app - Instância do Obsidian App.
   * @param {object} estado - Estado completo a persistir.
   */
  async salvar(app, estado) {
    if (!app || !app.vault) return;

    try {
      if (typeof app === 'object') {
        cachePorApp.set(app, estado);
      }
      const jsonStr = JSON.stringify(estado, null, 2);
      const file = app.vault.getAbstractFileByPath(CAMINHO_STORE);
      if (file) {
        await app.vault.modify(file, jsonStr);
      } else if (typeof app.vault.create === 'function') {
        await app.vault.create(CAMINHO_STORE, jsonStr);
      }

      // Sincronização defensiva com arquivo legado para retrocompatibilidade
      const legacyFile = app.vault.getAbstractFileByPath(CAMINHO_STORE_LEGADO);
      const saldoLegado = (!Number.isNaN(Number(estado.saldo)) && Number.isFinite(Number(estado.saldo)))
        ? Math.max(0, Math.floor(Number(estado.saldo)))
        : 0;
      const desbloqueadasLegadas = (Array.isArray(estado.desbloqueados) ? estado.desbloqueados : [])
        .filter(id => typeof id === 'string' && id.trim().length > 0)
        .filter(id => !id.startsWith('audio-') && !id.startsWith('theme-'));
      const transacoesLegadas = (Array.isArray(estado.historicoTransacoes) ? estado.historicoTransacoes : [])
        .filter(t => t && typeof t === 'object')
        .map(t => ({
          id: t.itemId || 'desconhecido',
          preco: (!Number.isNaN(Number(t.valor)) && Number.isFinite(Number(t.valor)))
            ? Math.max(0, Math.floor(Number(t.valor)))
            : 0,
          data: typeof t.dataIso === 'string' ? t.dataIso : new Date().toISOString()
        }));

      const legacyJson = JSON.stringify({
        moedas: saldoLegado,
        arvoreAtiva: (estado.equipados && typeof estado.equipados.botanical === 'string') ? estado.equipados.botanical : 'sprout',
        desbloqueadas: desbloqueadasLegadas,
        totalPlantadas: (estado.estatisticasBotanicas && !Number.isNaN(Number(estado.estatisticasBotanicas.totalPlantadas)) && Number.isFinite(Number(estado.estatisticasBotanicas.totalPlantadas)))
          ? Math.max(0, Math.floor(Number(estado.estatisticasBotanicas.totalPlantadas)))
          : 0,
        historicoCompras: transacoesLegadas
      }, null, 2);

      if (legacyFile) {
        await app.vault.modify(legacyFile, legacyJson);
      } else if (typeof app.vault.create === 'function') {
        await app.vault.create(CAMINHO_STORE_LEGADO, legacyJson);
      }
    } catch (e) {
      console.error('[ShopStore] Falha ao salvar estado:', e);
    }
  },


  /**
   * Retorna o saldo atual de moedas de foco de forma síncrona.
   *
   * @param {object} app
   * @returns {number}
   */
  obterSaldo(app) {
    return this._obterEstadoSincrono(app).saldo;
  },

  /**
   * Retorna a lista de identificadores desbloqueados, opcionalmente filtrada por categoria.
   *
   * @param {object} app
   * @param {'botanical'|'audio'|'cosmetic'|null} [categoria=null]
   * @returns {Array<string>}
   */
  obterItensDesbloqueados(app, categoria = null) {
    const estado = this._obterEstadoSincrono(app);
    const lista = (Array.isArray(estado.desbloqueados) ? estado.desbloqueados : [])
      .filter(id => typeof id === 'string' && id.trim().length > 0);

    if (!categoria) return [...lista];

    return lista.filter(id => {
      if (typeof id !== 'string' || id.trim().length === 0) return false;
      const item = this.obterItemPorId(id);
      if (item) return item.categoria === categoria;
      if (categoria === 'audio') return id.startsWith('audio-');
      if (categoria === 'cosmetic') return id.startsWith('theme-');
      if (categoria === 'botanical') return !id.startsWith('audio-') && !id.startsWith('theme-');
      return false;
    });
  },

  /**
   * Retorna o identificador do item equipado em uma dada categoria.
   *
   * @param {object} app
   * @param {'botanical'|'audio'|'cosmetic'} categoria
   * @returns {Promise<string|null>}
   */
  async obterEquipado(app, categoria) {
    const estado = await this.carregar(app);
    return (estado.equipados && estado.equipados[categoria]) || null;
  },

  /**
   * Credita moedas de foco na economia do usuário.
   *
   * @param {object} app
   * @param {number} quantidade
   * @param {string} [motivo='credito_manual']
   * @param {object|null} [eventBus=null]
   * @returns {Promise<number>} Novo saldo
   */
  async creditarMoedas(app, quantidade, motivo = 'credito_manual', eventBus = null) {
    return executarSerializado(app, async () => {
      const estado = await this.carregar(app);
      const qtdNum = Number(quantidade);
      const qtd = (!Number.isNaN(qtdNum) && Number.isFinite(qtdNum)) ? Math.max(0, Math.floor(qtdNum)) : 0;

      estado.saldo += qtd;
      estado.totalGanhosHistoricos += qtd;
      estado.historicoTransacoes.push({
        id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        tipo: 'credito_foco',
        valor: qtd,
        saldoResultante: estado.saldo,
        dataIso: new Date().toISOString(),
        detalhes: { motivo }
      });

      await this.salvar(app, estado);

      if (eventBus && typeof eventBus.emit === 'function') {
        try {
          eventBus.emit('economy:balance_updated', {
            saldoAtual: estado.saldo,
            delta: qtd,
            motivo
          });
        } catch (err) {
          console.warn('[ShopStore] Erro ao emitir evento de saldo:', err);
        }
      }

      return estado.saldo;
    });
  },

  /**
   * Credita moedas ganhas por conclusão de ciclo de foco no Pomodoro,
   * calculando a base (1 moeda a cada 5m) e bônus progressivo por combo.
   *
   * @param {object} app
   * @param {number} [minutos=25]
   * @param {number} [comboCiclos=1]
   * @param {object|null} [eventBus=null]
   * @returns {Promise<{ moedasGanhas: number, base: number, bonusCombo: number, combo: number, saldoAtual: number }>}
   */
  async creditarFoco(app, minutos = 25, comboCiclos = 1, eventBus = null) {
    return executarSerializado(app, async () => {
      const estado = await this.carregar(app);
      const mNum = Number(minutos);
      const m = (!Number.isNaN(mNum) && Number.isFinite(mNum)) ? Math.max(0, mNum) : 25;
      const base = Math.max(1, Math.floor(m / 5));

      const comboNum = Number(comboCiclos);
      const combo = (!Number.isNaN(comboNum) && Number.isFinite(comboNum)) ? Math.max(1, comboNum) : 1;

      let bonusCombo = 0;
      if (combo >= 10) bonusCombo = 3;
      else if (combo >= 5) bonusCombo = 2;
      else if (combo >= 3) bonusCombo = 1;

      const moedasGanhas = base + bonusCombo;
      estado.saldo += moedasGanhas;
      estado.totalGanhosHistoricos += moedasGanhas;

      if (!estado.estatisticasBotanicas) {
        estado.estatisticasBotanicas = { totalPlantadas: 0 };
      }
      estado.estatisticasBotanicas.totalPlantadas += 1;

      estado.historicoTransacoes.push({
        id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        tipo: 'credito_foco',
        valor: moedasGanhas,
        saldoResultante: estado.saldo,
        dataIso: new Date().toISOString(),
        detalhes: { minutos: m, comboCiclos: combo, bonusCombo, base }
      });

      await this.salvar(app, estado);

      if (eventBus && typeof eventBus.emit === 'function') {
        try {
          eventBus.emit('economy:balance_updated', {
            saldoAtual: estado.saldo,
            delta: moedasGanhas,
            motivo: 'foco_pomodoro'
          });
        } catch (err) {
          console.warn('[ShopStore] Erro ao emitir evento de foco:', err);
        }
      }

      return {
        moedasGanhas,
        base,
        bonusCombo,
        combo,
        saldoAtual: estado.saldo
      };
    });
  },

  /**
   * Executa a compra e desbloqueio de um item do catálogo.
   *
   * @param {object} app
   * @param {string} itemId
   * @param {object|null} [eventBus=null]
   * @returns {Promise<{ sucesso: boolean, mensagem: string, estado?: object, item?: object, erro?: string }>}
   */
  async comprarItem(app, itemId, eventBus = null) {
    return executarSerializado(app, async () => {
      const item = this.obterItemPorId(itemId);
      if (!item) {
        return { sucesso: false, mensagem: 'Item não encontrado no catálogo.', erro: 'ITEM_NOT_FOUND' };
      }

      const estado = await this.carregar(app);
      if (estado.desbloqueados.includes(itemId)) {
        return { sucesso: false, mensagem: 'Este item já foi desbloqueado!', erro: 'ALREADY_UNLOCKED', estado, item };
      }

      if (estado.saldo < item.preco) {
        const faltam = item.preco - estado.saldo;
        return { sucesso: false, mensagem: `Moedas insuficientes. Faltam ${faltam} moedas de foco.`, erro: 'INSUFFICIENT_FUNDS', estado, item };
      }

      estado.saldo -= item.preco;
      estado.desbloqueados.push(itemId);

      if (item.categoria && estado.equipados[item.categoria] !== undefined) {
        estado.equipados[item.categoria] = itemId;
      }

      estado.historicoTransacoes.push({
        id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        tipo: 'compra_item',
        itemId,
        valor: item.preco,
        saldoResultante: estado.saldo,
        dataIso: new Date().toISOString(),
        detalhes: { categoria: item.categoria, nome: item.nome }
      });

      await this.salvar(app, estado);

      if (eventBus && typeof eventBus.emit === 'function') {
        try {
          eventBus.emit('shop:item_purchased', { item, saldoAtual: estado.saldo });
          eventBus.emit('economy:balance_updated', { saldoAtual: estado.saldo, delta: -item.preco, motivo: 'compra_item' });
          eventBus.emit('inventory:item_equipped', { categoria: item.categoria, itemId, item });
        } catch (err) {
          console.warn('[ShopStore] Erro ao emitir eventos de compra:', err);
        }
      }

      return {
        sucesso: true,
        mensagem: `[Snoopy Loja] ${item.nome} desbloqueado com sucesso!`,
        estado,
        item
      };
    });
  },

  /**
   * Equipa um item já desbloqueado na respectiva categoria.
   *
   * @param {object} app
   * @param {string} itemId
   * @param {object|null} [eventBus=null]
   * @returns {Promise<{ sucesso: boolean, mensagem: string, estado?: object, item?: object }>}
   */
  async equiparItem(app, itemId, eventBus = null) {
    return executarSerializado(app, async () => {
      const item = this.obterItemPorId(itemId);
      const estado = await this.carregar(app);

      if (!item || !estado.desbloqueados.includes(itemId)) {
        return { sucesso: false, mensagem: 'Item bloqueado. Compre na loja primeiro.', estado };
      }

      if (item.categoria && estado.equipados[item.categoria] !== undefined) {
        estado.equipados[item.categoria] = itemId;
      }

      await this.salvar(app, estado);

      if (eventBus && typeof eventBus.emit === 'function') {
        try {
          eventBus.emit('inventory:item_equipped', { categoria: item.categoria, itemId, item });
        } catch (err) {
          console.warn('[ShopStore] Erro ao emitir evento de equipamento:', err);
        }
      }

      return {
        sucesso: true,
        mensagem: `Item ${item.nome} equipado com sucesso.`,
        estado,
        item
      };
    });
  },

  /**
   * Limpa a referência de cache em memória para a instância de app informada.
   *
   * @param {object|null} [app=null]
   */
  limparCacheMemoria(app = null) {
    if (app && typeof app === 'object') {
      cachePorApp.delete(app);
      filaExecucaoPorApp.delete(app);
    } else {
      cachePorApp = new WeakMap();
      filaExecucaoPorApp = new WeakMap();
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ShopStore;
}
if (typeof window !== 'undefined') {
  window.ShopStore = ShopStore;
}

return ShopStore;

/**
 * Snoopy Vault - Central de Customizações & Loja Autônoma (ShopModal)
 * Fornece interface modal com catálogo multi-categoria (Botânica, Áudio de Foco, Cosméticos),
 * exibição de saldo, compra com integridade transacional e equipamento direto de itens.
 *
 * @module modulos/shop/shop_modal
 */

class ShopModal {
  /**
   * Inicializa o gerenciador da janela modal da loja.
   *
   * @param {object} options - Opções de configuração e injeção de dependências.
   * @param {object} options.app - Instância do Obsidian App.
   * @param {object} [options.ModalFactory] - Fábrica central de modais do Vault.
   * @param {object} [options.ShopStore] - Gerenciador de persistência da economia/loja.
   * @param {object} [options.PomodoroAudio] - Motor de áudio de foco.
   * @param {Function} [options.renderIcon] - Função utilitária para renderização de SVG Lucide.
   * @param {'all'|'botanical'|'audio'|'cosmetic'} [options.categoriaInicial='all'] - Categoria ativa ao abrir.
   * @param {Function} [options.onAtualizar] - Callback assíncrono acionado após compra ou equipamento.
   */
  constructor(options = {}) {
    this.app = options.app || null;
    this.ModalFactory = options.ModalFactory || null;
    this.ShopStore = options.ShopStore || null;
    this.PomodoroAudio = options.PomodoroAudio || null;
    this.renderIcon = options.renderIcon || null;
    this.categoriaAtiva = options.categoriaInicial || 'all';
    this.onAtualizar = options.onAtualizar || null;
    this.isProcessing = false;
  }

  /**
   * Método estático de conveniência para instanciar e abrir o modal.
   *
   * @param {object} app - Instância do Obsidian.
   * @param {object} [options={}] - Configurações complementares.
   * @returns {Promise<{ modalBox: HTMLElement, fechar: Function }|null>}
   */
  static async abrir(app, options = {}) {
    const modal = new ShopModal({ app, ...options });
    return await modal.abrir();
  }

  /**
   * Executa a abertura e ciclo de vida do modal.
   *
   * @returns {Promise<{ modalBox: HTMLElement, fechar: Function }|null>}
   */
  async abrir() {
    if (!this.ModalFactory || typeof this.ModalFactory.abrir !== 'function') {
      console.warn('[ShopModal] ModalFactory ausente ou inválido.');
      return null;
    }

    let storeData = {
      saldo: 0,
      desbloqueados: ['sprout', 'audio-white-noise', 'theme-preset-snoopy'],
      equipados: { botanical: 'sprout', audio: 'audio-white-noise', cosmetic: 'theme-preset-snoopy' },
      totalGanhosHistoricos: 0
    };

    if (this.ShopStore && typeof this.ShopStore.carregar === 'function' && this.app) {
      try {
        storeData = await this.ShopStore.carregar(this.app);
      } catch (err) {
        console.error('[ShopModal] Erro ao carregar dados da loja:', err);
      }
    }

    const catalogoCompleto = (this.ShopStore && typeof this.ShopStore.obterCatalogo === 'function')
      ? this.ShopStore.obterCatalogo()
      : [];

    const htmlContent = `
      <div class="snoopy-modal-header" role="banner">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span id="snoopy-shop-header-icon" class="snoopy-icon-header-bag" aria-hidden="true"></span>
          <div>
            <h2 id="snoopy-shop-modal-title" class="snoopy-modal-title">CENTRAL DE CUSTOMIZAÇÕES & LOJA</h2>
            <div class="snoopy-card-subtitle">Personalize seu ambiente, desbloqueie espécies botânicas e faixas acústicas de foco</div>
          </div>
        </div>
        <button id="snoopy-shop-modal-close" class="snoopy-modal-close" aria-label="Fechar janela da loja" title="Fechar (Esc)"></button>
      </div>

      <!-- Sumário de KPIs -->
      <div class="snoopy-shop-kpi-row" role="region" aria-label="Resumo Econômico">
        <div class="snoopy-kpi-card is-balance">
          <div class="snoopy-kpi-val" id="snoopy-shop-kpi-balance">
            <span class="snoopy-shop-kpi-icon" data-icon="coins" data-color="#facc15" aria-hidden="true"></span>
            <span id="snoopy-shop-kpi-balance-num">${storeData.saldo}</span>
          </div>
          <span class="snoopy-kpi-lbl">Saldo de Foco</span>
        </div>

        <div class="snoopy-kpi-card is-unlocked">
          <div class="snoopy-kpi-val" id="snoopy-shop-kpi-unlocked">
            <span class="snoopy-shop-kpi-icon" data-icon="sparkles" data-color="#86efac" aria-hidden="true"></span>
            <span id="snoopy-shop-kpi-unlocked-num">${storeData.desbloqueados ? storeData.desbloqueados.length : 0}</span>
          </div>
          <span class="snoopy-kpi-lbl">Itens Desbloqueados</span>
        </div>

        <div class="snoopy-kpi-card is-catalog">
          <div class="snoopy-kpi-val" id="snoopy-shop-kpi-catalog">
            <span class="snoopy-shop-kpi-icon" data-icon="shopping-bag" data-color="#60a5fa" aria-hidden="true"></span>
            <span>${catalogoCompleto.length}</span>
          </div>
          <span class="snoopy-kpi-lbl">Total no Catálogo</span>
        </div>
      </div>

      <!-- Barra de Abas de Navegação -->
      <div class="snoopy-tab-bar" role="tablist" aria-label="Categorias de Itens">
        <button class="snoopy-btn-tab ${this.categoriaAtiva === 'all' ? 'active' : ''}" data-cat="all" role="tab" aria-selected="${this.categoriaAtiva === 'all'}">Todos</button>
        <button class="snoopy-btn-tab ${this.categoriaAtiva === 'botanical' ? 'active' : ''}" data-cat="botanical" role="tab" aria-selected="${this.categoriaAtiva === 'botanical'}">Botânica</button>
        <button class="snoopy-btn-tab ${this.categoriaAtiva === 'audio' ? 'active' : ''}" data-cat="audio" role="tab" aria-selected="${this.categoriaAtiva === 'audio'}">Áudios de Foco</button>
        <button class="snoopy-btn-tab ${this.categoriaAtiva === 'cosmetic' ? 'active' : ''}" data-cat="cosmetic" role="tab" aria-selected="${this.categoriaAtiva === 'cosmetic'}">Cosméticos</button>
      </div>

      <!-- Barra de Configurações Visuais da Loja -->
      <div class="snoopy-shop-visual-bar" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding: 6px 12px; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--snoopy-border, rgba(255, 255, 255, 0.08)); border-radius: 6px; font-size: 12px;">
        <label style="display: inline-flex; align-items: center; gap: 8px; cursor: pointer; user-select: none;">
          <input type="checkbox" id="snoopy-shop-toggle-ambient" ${storeData.ambientEnabled ? 'checked' : ''} style="cursor: pointer;" />
          <span style="color: var(--snoopy-text, var(--text-normal)); font-weight: 500;">Habilitar Animações de Fundo (Ambiente)</span>
        </label>
        <span class="snoopy-meta" style="font-size: 11px; opacity: 0.7;">Desativado por padrão para economizar RAM/CPU</span>
      </div>

      <!-- Container Dinâmico da Grade de Itens -->
      <div id="snoopy-shop-grid-container" class="snoopy-shop-grid-wrap" role="tabpanel" tabindex="0">
        <div id="snoopy-shop-grid" class="snoopy-shop-grid"></div>
      </div>
    `;

    return this.ModalFactory.abrir({
      htmlContent,
      maxWidth: '720px',
      onMontar: (modalBox, fechar) => {
        this._configurarModal(modalBox, fechar, storeData, catalogoCompleto);
      }
    });
  }

  /**
   * Conecta event listeners, renderiza ícones e popula o grid.
   * @private
   */
  _configurarModal(modalBox, fechar, storeData, catalogo) {
    if (!modalBox) return;

    const closeBtn = modalBox.querySelector('#snoopy-shop-modal-close');
    if (closeBtn) closeBtn.onclick = fechar;

    this._renderizarIcones(modalBox);

    const gridEl = modalBox.querySelector('#snoopy-shop-grid');
    const atualizarGrid = () => {
      if (!gridEl) return;
      if (typeof gridEl.empty === 'function') {
        gridEl.empty();
      } else {
        gridEl.innerHTML = '';
      }

      const itensFiltrados = (this.categoriaAtiva === 'all')
        ? catalogo
        : catalogo.filter(item => item.categoria === this.categoriaAtiva);

      if (itensFiltrados.length === 0) {
        this._renderizarEstadoVazio(gridEl);
        return;
      }

      for (const item of itensFiltrados) {
        const card = this._criarCardItem(item, storeData, modalBox, fechar, atualizarGrid);
        gridEl.appendChild(card);
      }

      this._renderizarIcones(gridEl);
    };

    modalBox.querySelectorAll('.snoopy-tab-bar button').forEach(btn => {
      btn.onclick = () => {
        modalBox.querySelectorAll('.snoopy-tab-bar button').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        this.categoriaAtiva = btn.getAttribute('data-cat') || 'all';
        atualizarGrid();
      };
    });

    const ambientToggle = modalBox.querySelector('#snoopy-shop-toggle-ambient');
    if (ambientToggle) {
      ambientToggle.onchange = async () => {
        const ativo = ambientToggle.checked;
        if (this.ShopStore && typeof this.ShopStore.definirAmbientEnabled === 'function') {
          await this.ShopStore.definirAmbientEnabled(this.app, ativo);
          storeData.ambientEnabled = ativo;
          if (typeof Notice !== 'undefined') {
            new Notice(`[Snoopy] Animações de fundo ${ativo ? 'ativadas' : 'desativadas'}.`);
          }
        }
      };
    }

    atualizarGrid();
  }

  /**
   * Constrói o elemento DOM do cartão de item com os 3 estados possíveis de botão.
   * @private
   */
  _criarCardItem(item, storeData, modalBox, fechar, atualizarGrid) {
    const card = document.createElement('div');
    card.className = 'snoopy-shop-card';

    const desbloqueado = Array.isArray(storeData.desbloqueados) && storeData.desbloqueados.includes(item.id);
    const categoriaKey = item.categoria;
    const equipado = storeData.equipados && storeData.equipados[categoriaKey] === item.id;
    const saldoSuficiente = (storeData.saldo !== undefined ? storeData.saldo : 0) >= item.preco;

    if (equipado) {
      card.classList.add('is-equipped');
    } else if (desbloqueado) {
      card.classList.add('is-unlocked');
    } else if (saldoSuficiente) {
      card.classList.add('is-affordable');
    } else {
      card.classList.add('is-locked');
    }

    let temaPreviewHtml = '';
    if (item.categoria === 'cosmetic' && this.ShopStore && typeof this.ShopStore.obterConfigTema === 'function') {
      const scheme = storeData.colorScheme || 'dark';
      const cfgTema = this.ShopStore.obterConfigTema(item.id, scheme);
      const tokens = (cfgTema && cfgTema.modos && cfgTema.modos[scheme]) ? cfgTema.modos[scheme].tokens : (cfgTema ? (cfgTema.tokens || cfgTema) : null);
      if (tokens) {
        temaPreviewHtml = `
          <div class="snoopy-shop-theme-preview" style="margin-top: 8px; padding: 6px 8px; border-radius: 6px; background: ${tokens.bg}; border: 1px solid ${tokens.border}; display: flex; flex-direction: column; gap: 5px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 11px; font-weight: 600; color: ${tokens.text};">Prévia (${scheme === 'light' ? 'Light' : 'Dark'})</span>
              <div style="display: flex; gap: 4px; align-items: center;">
                <span style="width: 10px; height: 10px; border-radius: 50%; background: ${tokens.accent}; display: inline-block;" title="Acento"></span>
                <span style="width: 10px; height: 10px; border-radius: 50%; background: ${tokens.panel}; display: inline-block; border: 1px solid rgba(128,128,128,0.3);" title="Painel"></span>
                <span style="width: 10px; height: 10px; border-radius: 50%; background: ${tokens.card}; display: inline-block; border: 1px solid rgba(128,128,128,0.3);" title="Card"></span>
              </div>
            </div>
            <div style="padding: 4px 6px; border-radius: 4px; background: ${tokens.card}; border: 1px solid ${tokens.border}; display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 10px; color: ${tokens.textMuted};">Texto legível</span>
              <span style="font-size: 9.5px; font-weight: 600; padding: 2px 6px; border-radius: 3px; background: ${tokens.btnBg}; color: ${tokens.btnText};">Botão</span>
            </div>
          </div>
        `;
      }
    }

    card.innerHTML = `
      <div class="snoopy-shop-card-header">
        <div class="snoopy-shop-item-icon" data-icon="${item.iconName || 'sparkles'}" data-color="${item.cor || 'var(--snoopy-module-accent)'}" style="color: ${item.cor || 'var(--snoopy-module-accent)'}; border-color: ${item.cor || 'var(--snoopy-module-accent)'};" aria-hidden="true"></div>
        <div class="snoopy-shop-card-body">
          <div class="snoopy-shop-title-row">
            <span class="snoopy-shop-title" title="${item.nome}">${item.nome}</span>
            <span class="snoopy-shop-category-tag" style="color: ${item.cor || 'var(--snoopy-module-accent)'};">${this._formatarCategoriaLabel(item.categoria)}</span>
          </div>
          <div class="snoopy-shop-benefit">${item.beneficio || ''}</div>
          <p class="snoopy-shop-lore" title="${item.lore || ''}">"${item.lore || ''}"</p>
          ${temaPreviewHtml}
        </div>
      </div>

      <div class="snoopy-shop-card-footer">
        <div class="snoopy-shop-price">
          ${desbloqueado
            ? `<span style="color: var(--snoopy-module-accent); font-weight: 700; font-size: 11.5px; display: inline-flex; align-items: center; gap: 4px;"><span class="snoopy-shop-coin-icon" data-icon="check" data-color="var(--snoopy-module-accent)"></span> Adquirido</span>`
            : `<span class="snoopy-shop-coin-icon" data-icon="coins" data-color="#facc15"></span> <span>${item.preco} moedas</span>`
          }
        </div>
        <div class="snoopy-shop-action-box"></div>
      </div>
    `;

    const actionBox = card.querySelector('.snoopy-shop-action-box');

    if (equipado) {
      const badge = document.createElement('span');
      badge.className = 'snoopy-shop-badge-equipped';
      badge.innerHTML = `<span class="snoopy-shop-action-icon" data-icon="check" data-color="var(--snoopy-module-accent)"></span> Equipado`;
      actionBox.appendChild(badge);
    } else if (desbloqueado) {
      const btnEquipar = document.createElement('button');
      btnEquipar.className = 'snoopy-btn-action snoopy-btn-sm';
      btnEquipar.textContent = 'Equipar';
      btnEquipar.onclick = async () => {
        if (this.isProcessing) return;
        this.isProcessing = true;
        try {
          if (this.ShopStore && typeof this.ShopStore.equiparItem === 'function') {
            const bus = this.eventBus || (typeof window !== 'undefined' ? window._snoopyEvents : null);
            const res = await this.ShopStore.equiparItem(this.app, item.id, bus);
            if (res.sucesso) {
              storeData.equipados = res.estado.equipados;
              if (item.categoria === 'cosmetic') {
                this.ShopStore.aplicarTema(item.id, null, storeData.colorScheme || 'dark');
              }
              if (typeof Notice !== 'undefined') new Notice(`Item '${item.nome}' equipado com sucesso!`);
              if (typeof this.onAtualizar === 'function') await this.onAtualizar(res.estado);
              atualizarGrid();
            }
          }
        } finally {
          this.isProcessing = false;
        }
      };
      actionBox.appendChild(btnEquipar);
    } else {
      const btnComprar = document.createElement('button');
      btnComprar.className = saldoSuficiente ? 'snoopy-btn-primary snoopy-btn-sm' : 'snoopy-btn-action snoopy-btn-sm is-disabled';
      btnComprar.textContent = saldoSuficiente ? 'Desbloquear' : `Faltam ${item.preco - storeData.saldo}`;
      btnComprar.title = saldoSuficiente ? `Adquirir ${item.nome} por ${item.preco} moedas` : `Saldo insuficiente. Necessário ${item.preco} moedas.`;

      if (!saldoSuficiente) {
        btnComprar.disabled = true;
      }

      btnComprar.onclick = async () => {
        if (this.isProcessing || !saldoSuficiente) return;
        this.isProcessing = true;
        btnComprar.disabled = true;

        try {
          if (this.ShopStore && typeof this.ShopStore.comprarItem === 'function') {
            const bus = this.eventBus || (typeof window !== 'undefined' ? window._snoopyEvents : null);
            const res = await this.ShopStore.comprarItem(this.app, item.id, bus);
            if (res.sucesso) {
              storeData.saldo = res.estado.saldo;
              storeData.desbloqueados = res.estado.desbloqueados;
              storeData.equipados = res.estado.equipados;

              if (item.categoria === 'cosmetic') {
                this.ShopStore.aplicarTema(item.id, null, storeData.colorScheme || 'dark');
              }

              const balanceEl = modalBox.querySelector('#snoopy-shop-kpi-balance-num');
              if (balanceEl) balanceEl.textContent = String(storeData.saldo);

              const unlockedEl = modalBox.querySelector('#snoopy-shop-kpi-unlocked-num');
              if (unlockedEl) unlockedEl.textContent = String(storeData.desbloqueados.length);

              if (typeof Notice !== 'undefined') new Notice(res.mensagem || `Você desbloqueou ${item.nome}!`);
              if (typeof this.onAtualizar === 'function') await this.onAtualizar(res.estado);
              atualizarGrid();
            } else {
              if (typeof Notice !== 'undefined') new Notice(res.mensagem || 'Falha na compra.');
            }
          }
        } catch (err) {
          console.error('[ShopModal] Erro ao processar compra:', err);
        } finally {
          this.isProcessing = false;
        }
      };
      actionBox.appendChild(btnComprar);
    }

    return card;
  }

  /**
   * Renderiza estado vazio padronizado usando UIKit ou fallback.
   * @private
   */
  _renderizarEstadoVazio(container) {
    if (typeof UIKit !== 'undefined' && typeof UIKit.criarEstadoVazio === 'function') {
      UIKit.criarEstadoVazio(container, {
        icon: 'shopping-bag',
        titulo: 'Categoria Vazia',
        descricao: 'Nenhum item disponível nesta categoria.'
      });
    } else {
      const emptyBox = document.createElement('div');
      emptyBox.className = 'snoopy-empty';
      emptyBox.innerHTML = `
        <span class="snoopy-empty-title">Categoria Vazia</span>
        <span class="snoopy-empty-desc">Nenhum item disponível nesta categoria.</span>
      `;
      container.appendChild(emptyBox);
    }
  }

  /**
   * Injeta os SVGs Lucide canônicos sem emojis.
   * @private
   */
  _renderizarIcones(container) {
    let renderFn = this.renderIcon;
    if (!renderFn && typeof UIKit !== 'undefined' && typeof UIKit.renderIcon === 'function') {
      renderFn = (c, n, o) => UIKit.renderIcon(c, n, o);
    }
    if (!renderFn) return;

    const temFilhos = (el) => {
      if (!el) return false;
      if (typeof el.hasChildNodes === 'function') return el.hasChildNodes();
      if (Array.isArray(el.childNodes) && el.childNodes.length > 0) return true;
      if (Array.isArray(el.children) && el.children.length > 0) return true;
      return Boolean(el.innerHTML && el.innerHTML.trim().length > 0);
    };

    const headerIcon = container.querySelector('#snoopy-shop-header-icon');
    if (headerIcon && !temFilhos(headerIcon)) {
      renderFn(headerIcon, 'shopping-bag', { size: 18, color: '#facc15' });
    }

    container.querySelectorAll('.snoopy-shop-kpi-icon').forEach(el => {
      if (temFilhos(el)) return;
      const ic = el.getAttribute('data-icon') || 'coins';
      const cor = el.getAttribute('data-color') || '#ffffff';
      renderFn(el, ic, { size: 16, color: cor });
    });

    container.querySelectorAll('.snoopy-shop-item-icon').forEach(el => {
      if (temFilhos(el)) return;
      const ic = el.getAttribute('data-icon') || 'sparkles';
      const cor = el.getAttribute('data-color') || '#86efac';
      renderFn(el, ic, { size: 20, color: cor });
    });

    container.querySelectorAll('.snoopy-shop-coin-icon, .snoopy-shop-action-icon').forEach(el => {
      if (temFilhos(el)) return;
      const ic = el.getAttribute('data-icon') || 'coins';
      const cor = el.getAttribute('data-color') || '#facc15';
      renderFn(el, ic, { size: 13, color: cor });
    });
  }

  /**
   * Formata label legível para a categoria.
   * @private
   */
  _formatarCategoriaLabel(cat) {
    switch (cat) {
      case 'botanical': return 'Botânica';
      case 'audio': return 'Áudio de Foco';
      case 'cosmetic': return 'Cosmético';
      default: return cat;
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ShopModal;
}
if (typeof window !== 'undefined') {
  window.ShopModal = ShopModal;
}

return ShopModal;

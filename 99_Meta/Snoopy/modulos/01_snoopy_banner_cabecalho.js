/**
 * Snoopy Vault - Módulo 01: Banner e Cabeçalho de Ações Rápidas
 * Renderiza o banner panorâmico com fallback, data dinâmica localizada e botões de atalho rápido (1-clique).
 *
 * @module modulos/01_snoopy_banner_cabecalho
 */
return {
  id: 'snoopy_banner_cabecalho',
  titulo: 'Banner & Cabeçalho',

  /**
   * Ponto de entrada do ciclo de vida de renderização do Módulo 01.
   *
   * @param {object} ctx - Contexto compartilhado injetado pelo orquestrador view.js.
   * @param {HTMLElement} ctx.root - Contêiner DOM raiz da dashboard.
   * @param {object} ctx.app - Instância global do Obsidian App.
   * @param {Date} ctx.now - Objeto de data atual no momento do boot.
   * @param {string} ctx.formattedDate - Data atual formatada em português por extenso.
   * @param {function(): Promise<TFile>} ctx.garantirNotaDiaria - Obtém ou cria a nota diária do dia.
   * @param {function(string, string, string): Promise<void>} ctx.criarNotaInstantanea - Cria nota via template.
   * @param {function(HTMLElement, string, object=): HTMLElement} [ctx.renderIcon] - Helper para renderizar SVGs Lucide.
   * @returns {Promise<void>}
   */
  async render(ctx) {
    const { root, app, now, dateOptions, formattedDate, garantirNotaDiaria, criarNotaInstantanea } = ctx;

    // 1. BANNER PANORÂMICO DO SNOOPY
    const bannerBox = root.createEl('div', { cls: 'snoopy-banner-box' });
    const bannerImg = bannerBox.createEl('img', {
      attr: { loading: 'lazy', decoding: 'async' }
    });
    const customBannerPath = (ctx.config && ctx.config.banner_imagem) ? ctx.config.banner_imagem : "99_Meta/Attachments/snoopy_panoramic.jpg";
    let panoramicRes = null;
    try {
      panoramicRes = app.vault.adapter.getResourcePath(customBannerPath);
    } catch(e) {}
    const fallbackRes = app.vault.adapter.getResourcePath("99_Meta/Attachments/snoopy_reading_banner.png");
    bannerImg.src = panoramicRes || fallbackRes || "";
    bannerImg.alt = "Snoopy Lendo Panorâmico";

    // 2. CABEÇALHO COM DATA & PÍLULAS DE AÇÃO RÁPIDA
    const headerRow = root.createEl('div', { cls: 'snoopy-header-row' });

    const dateBox = headerRow.createEl('div');
    dateBox.createEl('div', { 
      cls: 'snoopy-date-title', 
      text: formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1) 
    });
    const pad = (n) => String(n).padStart(2, '0');
    const dataNumericaBR = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;
    dateBox.createEl('div', { 
      cls: 'snoopy-meta',
      text: `${dataNumericaBR} • Espaço Central de Foco • Snoopy Edition`
    });

    const navPillsRow = headerRow.createEl('div', { cls: 'snoopy-nav-pills' });
    const navItems = [
      { label: 'HOJE', action: 'daily', icon: 'calendar' },
      { label: 'ESTUDOS', action: 'sub_estudos', icon: 'book-open' },
      { label: 'INBOX', folder: '01_Inbox', tpl: '99_Meta/Templates/Template - Inbox.md', prefix: 'Nota Rápida', icon: 'inbox' },
      { label: '+ PROJETO', folder: '02_Projetos', tpl: '99_Meta/Templates/Template - Projeto.md', prefix: 'Novo Projeto', icon: 'folder-plus' },
      { label: '+ LEITURA', folder: '04_Leituras/Livros', tpl: '99_Meta/Templates/Template - Livro.md', prefix: 'Novo Livro', icon: 'book-plus' },
      { label: 'CONFIG', action: 'config', icon: 'settings' }
    ];

    navItems.forEach(item => {
      const criarBtnFn = (ctx.UIKit && typeof ctx.UIKit.criarBotao === 'function')
        ? ctx.UIKit.criarBotao.bind(ctx.UIKit)
        : null;

      const onClick = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (e && e.stopPropagation) e.stopPropagation();

        if (item.action === 'daily') {
          const dailyFile = await garantirNotaDiaria();
          await app.workspace.openLinkText(dailyFile.path, "", false);
          new Notice(`Nota de hoje aberta: ${dailyFile.basename}`);
        } else if (item.action === 'sub_estudos') {
          await app.workspace.openLinkText("03_Estudos/Painel de Estudos.md", "", false);
          new Notice('Painel de Estudos aberto');
        } else if (item.action === 'config') {
          await app.workspace.openLinkText("99_Meta/⚙️ Configurações.md", "", false);
          new Notice('Configurações do Snoopy Vault abertas');
        } else {
          criarNotaInstantanea(item.folder, item.tpl, item.prefix);
        }
      };

      if (criarBtnFn) {
        criarBtnFn(navPillsRow, {
          label: item.label,
          icon: item.icon,
          variant: 'pill',
          size: 'sm',
          onClick
        }, ctx);
      } else {
        const btn = navPillsRow.createEl('button', { cls: 'snoopy-nav-pill-btn snoopy-btn-sm' });
        if (ctx.renderIcon && item.icon) {
          ctx.renderIcon(btn, item.icon, { size: 11 });
        }
        btn.createEl('span', { text: item.label });
        btn.addEventListener('click', onClick);
      }
    });
  }
};

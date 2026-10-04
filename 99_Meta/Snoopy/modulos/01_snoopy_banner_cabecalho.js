/**
 * Snoopy Vault - Módulo 01: Banner e Cabeçalho de Ações Rápidas
 * Renderiza o banner panorâmico do Snoopy, data formatada e pílulas de 1-clique.
 */
return {
  id: 'snoopy_banner_cabecalho',
  titulo: 'Banner & Cabeçalho',
  async render(ctx) {
    const { root, app, now, dateOptions, formattedDate, garantirNotaDiaria, criarNotaInstantanea } = ctx;

    // 1. BANNER PANORÂMICO DO SNOOPY
    const bannerBox = root.createEl('div', { cls: 'abyssal-banner-box' });
    const bannerImg = bannerBox.createEl('img');
    const customBannerPath = (ctx.config && ctx.config.banner_imagem) ? ctx.config.banner_imagem : "99_Meta/Attachments/snoopy_panoramic.jpg";
    let panoramicRes = null;
    try {
      panoramicRes = app.vault.adapter.getResourcePath(customBannerPath);
    } catch(e) {}
    const fallbackRes = app.vault.adapter.getResourcePath("99_Meta/Attachments/snoopy_reading_banner.png");
    bannerImg.src = panoramicRes || fallbackRes || "";
    bannerImg.alt = "Snoopy Lendo Panorâmico";

    // 2. CABEÇALHO COM DATA & PÍLULAS DE AÇÃO RÁPIDA
    const headerRow = root.createEl('div', { cls: 'abyssal-header-row' });

    const dateBox = headerRow.createEl('div');
    dateBox.createEl('div', { 
      cls: 'abyssal-date-title', 
      text: formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1) 
    });
    dateBox.createEl('div', { 
      text: 'Espaço Central de Foco • Abyssal Snoopy Edition', 
      attr: { style: 'font-size: 13px; font-family: monospace; color: #a1a1aa; margin-top: 4px;' } 
    });

    const navPillsRow = headerRow.createEl('div', { cls: 'abyssal-nav-pills' });
    const navItems = [
      { label: '📅 HOJE', action: 'daily' },
      { label: '📚 ESTUDOS', action: 'sub_estudos' },
      { label: '⚡ INBOX', folder: '01_Inbox', tpl: '99_Meta/Templates/Template - Inbox.md', prefix: 'Nota Rápida' },
      { label: '📁 + PROJETO', folder: '02_Projetos', tpl: '99_Meta/Templates/Template - Projeto.md', prefix: 'Novo Projeto' },
      { label: '📖 + LEITURA', folder: '04_Leituras/Livros', tpl: '99_Meta/Templates/Template - Livro.md', prefix: 'Novo Livro' },
      { label: '⚙️ CONFIG', action: 'config' }
    ];

    navItems.forEach(item => {
      const btn = navPillsRow.createEl('button', { cls: 'abyssal-nav-pill-btn', text: item.label });
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (item.action === 'daily') {
          const dailyFile = await garantirNotaDiaria();
          await app.workspace.openLinkText(dailyFile.path, "", false);
          new Notice(`📅 Nota de hoje aberta: ${dailyFile.basename}`);
        } else if (item.action === 'sub_estudos') {
          await app.workspace.openLinkText("03_Estudos/Painel de Estudos.md", "", false);
          new Notice('📚 Painel de Estudos aberto');
        } else if (item.action === 'config') {
          await app.workspace.openLinkText("99_Meta/⚙️ Configurações.md", "", false);
          new Notice('⚙️ Configurações do Snoopy Vault abertas');
        } else {
          criarNotaInstantanea(item.folder, item.tpl, item.prefix);
        }
      });
    });
  }
};

/**
 * Snoopy Vault - Módulo 05: Leituras & Matérias de Estudo
 * Exibe a estante de livros em andamento com progresso de leitura e a grade de matérias ativas.
 */
return {
  id: 'snoopy_leituras_estudos',
  titulo: 'Leituras & Estudos',
  async render(ctx) {
    const { bottomGrid, app, dv } = ctx;

    // COLUNA DIREITA: READING & MATÉRIAS
    const rightBottom = bottomGrid.createEl('div', { cls: 'abyssal-card-box', attr: { style: 'gap: 18px;' } });

    // 1. ESTANTE DE LEITURA (READING)
    const readingBox = rightBottom.createEl('div');
    readingBox.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px;">
        <span class="abyssal-section-title">READING</span>
        <span style="font-size: 12px; font-family: monospace; color: #a1a1aa;">04_Leituras/Livros</span>
      </div>
    `;

    const shelf = readingBox.createEl('div', { cls: 'abyssal-books-shelf' });
    const livros = dv.pages('"04_Leituras/Livros"')
      .where(l => !l.file.name.includes("Template"))
      .sort(l => l.file.mtime, 'desc')
      .slice(0, 3);

    if (livros.length === 0) {
      shelf.innerHTML = '<div style="color: #71717a; font-size: 13px;">Nenhum livro em 04_Leituras.</div>';
    } else {
      livros.forEach(b => {
        const item = shelf.createEl('div', { cls: 'abyssal-book-item' });
        item.addEventListener('click', () => app.workspace.openLinkText(b.file.path, "", false));

        const img = item.createEl('img', { cls: 'abyssal-book-cover' });
        img.src = b.cover || "https://images.pexels.com/photos/10254198/pexels-photo-10254198.jpeg";
        
        item.createEl('div', { 
          text: b.title || b.file.name, 
          attr: { style: 'font-size: 13px; font-weight: 700; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;' } 
        });

        const cur = Number(b.current_page) || 0;
        const tot = Number(b.total_pages) || 0;
        const pct = tot > 0 ? Math.round((cur / tot) * 100) : 0;

        const bookProg = item.createEl('div');
        bookProg.innerHTML = `
          <div style="display: flex; justify-content: space-between; font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 3px;">
            <span>${tot > 0 ? `${cur}/${tot}p` : 'Lendo'}</span>
            <span style="color: #ffffff; font-weight: bold;">${pct}%</span>
          </div>
          <div class="abyssal-prog-track" style="height: 5px; width: 100%;">
            <div class="abyssal-prog-fill" style="width: ${pct}%; background: #ffffff;"></div>
          </div>
        `;
      });
    }

    // 2. MATÉRIAS & ESTUDOS
    const subjectsSection = rightBottom.createEl('div', { attr: { style: 'padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.06);' } });
    subjectsSection.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px;">
        <span class="abyssal-section-title">MATÉRIAS & ESTUDOS</span>
        <span style="font-size: 12px; font-family: monospace; color: #a1a1aa;">03_Estudos</span>
      </div>
    `;

    const subjectsGrid = subjectsSection.createEl('div', { cls: 'abyssal-subject-grid' });
    const estudos = dv.pages('"03_Estudos"')
      .where(e => !e.file.name.includes("Template"))
      .slice(0, 4);

    const subjectIcons = ['💻', '🗄️', '📐', '🧠'];
    estudos.forEach((e, idx) => {
      const card = subjectsGrid.createEl('div', { cls: 'abyssal-subject-card' });
      card.innerHTML = `
        <span style="font-size: 1.4rem;">${subjectIcons[idx % subjectIcons.length]}</span>
        <div style="overflow: hidden;">
          <div style="font-size: 14px; font-weight: 700; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${e.title || e.file.name}</div>
          <div style="font-size: 12px; font-family: monospace; color: #a1a1aa; margin-top: 2px;">${e.disciplina || 'Geral'}</div>
        </div>
      `;
      card.addEventListener('click', () => app.workspace.openLinkText(e.file.path, "", false));
    });
  }
};

---
title: "Painel de Leituras"
tags:
  - dashboard
  - leituras
banner: "99_Meta/Attachments/snoopy_panoramic.jpg"
banner_icon: "📖"
---

```dataviewjs
const root = dv.container.createEl('div', { cls: 'abyssal-container' });

// Cabeçalho
const header = root.createEl('div', {
  attr: { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 12px 18px; background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 10px;' }
});

header.innerHTML = `
  <div style="display: flex; align-items: center; gap: 12px;">
    <button id="btn-back-home" class="abyssal-btn-action" style="font-size: 11px; padding: 4px 10px;">← HOME</button>
    <div>
      <div style="font-size: 15px; font-weight: 700; color: var(--text-normal); text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 8px;">
        <span>📖</span> BOOKSHELF KO-READER • ESTANTE COMPLETA
      </div>
      <div style="font-size: 11px; font-family: monospace; color: var(--text-muted);">Acervo Pessoal de Leituras & Metadados</div>
    </div>
  </div>
`;

header.querySelector('#btn-back-home').onclick = () => app.workspace.openLinkText("00_Home/Home.md", "", false);

// Livros
const livros = dv.pages('"04_Leituras/Livros"')
  .where(l => !l.file.name.includes("Template"))
  .sort(l => l.file.mtime, 'desc');

const grid = root.createEl('div', {
  attr: { style: 'display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 16px;' }
});

livros.forEach(b => {
  const card = grid.createEl('div', {
    cls: 'abyssal-book-item',
    attr: { style: 'width: 100%; cursor: pointer;' }
  });
  card.onclick = () => app.workspace.openLinkText(b.file.path, "", false);

  const img = card.createEl('img', {
    cls: 'abyssal-book-cover',
    attr: { style: 'width: 100%; height: 180px; border-radius: 6px; object-fit: cover; border: 1px solid var(--background-modifier-border);' }
  });
  img.src = b.cover || "https://images.pexels.com/photos/10254198/pexels-photo-10254198.jpeg";
  img.onerror = () => { img.src = "https://images.pexels.com/photos/10254198/pexels-photo-10254198.jpeg"; };

  card.createEl('div', {
    text: b.title || b.file.name,
    attr: { style: 'font-size: 12px; font-weight: 700; color: var(--text-normal); margin-top: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;' }
  });

  card.createEl('div', {
    text: b.author || 'Autor desconhecido',
    attr: { style: 'font-size: 10.5px; font-family: monospace; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;' }
  });

  const cur = Number(b.current_page) || 0;
  const tot = Number(b.total_pages) || 0;
  const pct = tot > 0 ? Math.round((cur / tot) * 100) : 0;

  const prog = card.createEl('div');
  prog.innerHTML = `
    <div style="display: flex; justify-content: space-between; font-size: 10px; font-family: monospace; color: var(--text-muted); margin: 3px 0 2px;">
      <span>${b.status || 'Quero ler'}</span>
      <span style="font-weight: bold; color: var(--text-normal);">${pct}%</span>
    </div>
    <div class="abyssal-prog-track" style="height: 4px; width: 100%;">
      <div class="abyssal-prog-fill" style="width: ${pct}%; background: var(--text-normal);"></div>
    </div>
  `;
});
```

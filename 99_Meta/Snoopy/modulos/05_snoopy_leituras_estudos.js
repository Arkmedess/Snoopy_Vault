/**
 * Snoopy Vault - Módulo 05: Vitrine de Estudos & Bookshelf de Leituras
 * Posicionado acima do Kanban com proporção 50/50:
 * - Esquerda: Estudos com atalho direto ao Painel e destaque da matéria da vez no ciclo
 * - Direita: Bookshelf estilo KOReader com capas e busca de metadados na nuvem via API
 */
return {
  id: 'snoopy_leituras_estudos',
  titulo: 'Estudos & Bookshelf de Leituras',
  async render(ctx) {
    const { root, app, dv, todayStr } = ctx;

    // CONTAINER PRINCIPAL: VITRINE 50/50 LADO A LADO
    const showcaseGrid = root.createEl('div', { cls: 'abyssal-showcase-grid' });

    // =========================================================================
    // 1. COLUNA ESQUERDA: ESTUDOS & CICLO ATIVO (ESTILO ESTUDEI)
    // =========================================================================
    const estudosCol = showcaseGrid.createEl('div', { 
      cls: 'abyssal-card-box', 
      attr: { style: 'display: flex; flex-direction: column; gap: 12px;' } 
    });

    const estudos = dv.pages('"03_Estudos"')
      .where(e => !e.file.name.includes("Template") && !e.file.name.includes("Painel"));

    const estudosHeader = estudosCol.createEl('div', { 
      attr: { style: 'display: flex; justify-content: space-between; align-items: center;' } 
    });

    estudosHeader.innerHTML = `
      <a id="link-painel-estudos" class="abyssal-section-title-link" title="Abrir Subdashboard Completo de Estudos (Framework Estudei)">
        <span>📚</span> ESTUDOS & CICLO ATIVO <span style="font-size: 11px; opacity: 0.6;">↗</span>
      </a>
      <span style="font-size: 11px; font-family: monospace; color: var(--text-muted);">${estudos.length} matérias</span>
    `;

    const linkPainelEstudos = estudosHeader.querySelector('#link-painel-estudos');
    if (linkPainelEstudos) {
      linkPainelEstudos.addEventListener('click', (e) => {
        e.preventDefault();
        app.workspace.openLinkText("03_Estudos/Painel de Estudos.md", "", false);
      });
    }

    // Leitura da Matéria da Vez no Ciclo
    let cicloIdx = 0;
    try {
      const cicloFile = app.vault.getAbstractFileByPath("99_Meta/ciclo-estudos.json");
      if (cicloFile) {
        const raw = await app.vault.read(cicloFile);
        const parsed = JSON.parse(raw);
        if (typeof parsed.disciplinaAtualIdx === 'number') cicloIdx = parsed.disciplinaAtualIdx;
      }
    } catch(e) {}

    const materiasLista = [...estudos];
    if (materiasLista.length > 0) {
      if (cicloIdx >= materiasLista.length) cicloIdx = 0;
      const materiaVez = materiasLista[cicloIdx];

      // Destaque da Matéria da Vez
      const vezCard = estudosCol.createEl('div', {
        attr: {
          style: 'background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-left: 3px solid var(--interactive-accent, #60a5fa); border-radius: 6px; padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; cursor: pointer;'
        }
      });

      vezCard.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 2px; overflow: hidden; padding-right: 8px;">
          <span style="font-size: 10px; font-family: monospace; font-weight: 700; color: var(--interactive-accent, #60a5fa); text-transform: uppercase;">▶ Matéria da Vez no Ciclo</span>
          <span style="font-size: 13.5px; font-weight: 700; color: var(--text-normal); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${materiaVez.title || materiaVez.file.name}</span>
          <span style="font-size: 11px; font-family: monospace; color: var(--text-muted);">${materiaVez.disciplina || 'Geral'} • Status: ${materiaVez.status || 'Em Andamento'}</span>
        </div>
        <span class="abyssal-todo-source" style="font-size: 11px; padding: 2px 8px; flex-shrink: 0;">Abrir →</span>
      `;

      vezCard.addEventListener('click', () => {
        app.workspace.openLinkText(materiaVez.file.path, "", false);
      });
    }

    // Mini Grade de Matérias
    const subjectIcons = ['💻', '🗄️', '📐', '🧠', '🔬', '⚙️'];
    const miniGrid = estudosCol.createEl('div', { 
      attr: { style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px;' } 
    });

    materiasLista.slice(0, 4).forEach((e, idx) => {
      const card = miniGrid.createEl('div', { 
        cls: 'abyssal-subject-card',
        attr: { style: 'padding: 8px 10px; cursor: pointer;' }
      });
      card.innerHTML = `
        <span style="font-size: 1.2rem;">${subjectIcons[idx % subjectIcons.length]}</span>
        <div style="overflow: hidden;">
          <div style="font-size: 12.5px; font-weight: 600; color: var(--text-normal); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${e.title || e.file.name}</div>
          <div style="font-size: 10.5px; font-family: monospace; color: var(--text-muted);">${e.status || 'Ativo'}</div>
        </div>
      `;
      card.addEventListener('click', () => app.workspace.openLinkText(e.file.path, "", false));
    });

    // =========================================================================
    // 2. COLUNA DIREITA: BOOKSHELF DE LEITURAS (ESTILO KOREADER)
    // =========================================================================
    const leiturasCol = showcaseGrid.createEl('div', { 
      cls: 'abyssal-card-box', 
      attr: { style: 'display: flex; flex-direction: column; gap: 12px;' } 
    });

    const leiturasHeader = leiturasCol.createEl('div', { 
      attr: { style: 'display: flex; justify-content: space-between; align-items: center;' } 
    });

    leiturasHeader.innerHTML = `
      <a id="link-painel-leituras" class="abyssal-section-title-link" title="Abrir pasta de leituras">
        <span>📖</span> BOOKSHELF KO-READER <span style="font-size: 11px; opacity: 0.6;">↗</span>
      </a>
      <button id="btn-buscar-livro-nuvem" class="abyssal-nav-pill-btn" style="padding: 2px 8px; font-size: 10.5px;" title="Buscar metadados de livro na nuvem via API">+ BUSCAR NA NUVEM</button>
    `;

    const linkPainelLeituras = leiturasHeader.querySelector('#link-painel-leituras');
    if (linkPainelLeituras) {
      linkPainelLeituras.addEventListener('click', (e) => {
        e.preventDefault();
        app.workspace.openLinkText("04_Leituras/Livros", "", false);
      });
    }

    const shelf = leiturasCol.createEl('div', { 
      cls: 'abyssal-books-shelf',
      attr: { style: 'display: flex; gap: 14px; overflow-x: auto; padding-bottom: 4px;' }
    });

    const livros = dv.pages('"04_Leituras/Livros"')
      .where(l => !l.file.name.includes("Template"))
      .sort(l => l.file.mtime, 'desc')
      .slice(0, 4);

    if (livros.length === 0) {
      shelf.innerHTML = '<div style="color: var(--text-muted); font-size: 12px; font-family: monospace; padding: 18px 0; text-align: center; width: 100%;">Nenhum livro cadastrado. Use "+ BUSCAR NA NUVEM" para adicionar!</div>';
    } else {
      livros.forEach(b => {
        const item = shelf.createEl('div', { 
          cls: 'abyssal-book-item',
          attr: { style: 'width: 82px; flex-shrink: 0;' }
        });
        item.addEventListener('click', () => app.workspace.openLinkText(b.file.path, "", false));

        const img = item.createEl('img', { cls: 'abyssal-book-cover', attr: { style: 'width: 82px; height: 118px; border-radius: 5px; object-fit: cover; border: 1px solid var(--background-modifier-border);' } });
        img.src = b.cover || "https://images.pexels.com/photos/10254198/pexels-photo-10254198.jpeg";
        img.onerror = () => {
          img.src = "https://images.pexels.com/photos/10254198/pexels-photo-10254198.jpeg";
        };
        
        item.createEl('div', { 
          text: b.title || b.file.name, 
          attr: { style: 'font-size: 11.5px; font-weight: 600; color: var(--text-normal); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;' } 
        });

        const cur = Number(b.current_page) || 0;
        const tot = Number(b.total_pages) || 0;
        const pct = tot > 0 ? Math.round((cur / tot) * 100) : 0;

        const bookProg = item.createEl('div');
        bookProg.innerHTML = `
          <div style="display: flex; justify-content: space-between; font-size: 10px; font-family: monospace; color: var(--text-muted); margin-bottom: 2px;">
            <span>${tot > 0 ? `${cur}/${tot}p` : 'Lendo'}</span>
            <span style="color: var(--text-normal); font-weight: bold;">${pct}%</span>
          </div>
          <div class="abyssal-prog-track" style="height: 4px; width: 100%;">
            <div class="abyssal-prog-fill" style="width: ${pct}%; background: var(--text-normal);"></div>
          </div>
        `;
      });
    }

    // =========================================================================
    // 3. MODAL DE BUSCA DE LIVROS NA NUVEM VIA API (KO-READER ASSISTANT)
    // =========================================================================
    function abrirModalBuscaLivro() {
      const modalBg = document.createElement('div');
      modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';
      
      const modalBox = document.createElement('div');
      modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 480px; width: 100%; max-height: 85vh; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 12px; font-family: sans-serif;';
      
      modalBox.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 14px; font-weight: bold; color: #ffffff;">📖 Buscar Livro na Nuvem (Bookshelf)</span>
          <button id="modal-close-book" style="background: none; border: none; color: #71717a; cursor: pointer; font-size: 14px;">✕</button>
        </div>
        <div style="font-size: 11px; font-family: monospace; color: #a1a1aa;">Digite o título ou autor (busca online via Open Library):</div>
        
        <div style="display: flex; gap: 8px;">
          <input id="modal-book-search-input" type="text" placeholder="Ex: Hábitos Atômicos, Clean Code..." style="flex: 1; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 8px; color: #ffffff; font-size: 12px; outline: none;">
          <button id="modal-book-search-btn" class="abyssal-btn-primary" style="font-size: 11px; padding: 6px 14px;">Buscar</button>
        </div>

        <div id="modal-book-results" style="max-height: 320px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; margin-top: 4px; padding-right: 4px;">
          <div style="font-size: 11.5px; font-family: monospace; color: #71717a; text-align: center; padding: 20px 0;">Digite o termo e clique em "Buscar".</div>
        </div>
      `;
      
      modalBg.appendChild(modalBox);
      document.body.appendChild(modalBg);
      
      const fechar = () => {
        if (modalBg.parentNode) document.body.removeChild(modalBg);
      };

      modalBg.addEventListener('click', (e) => {
        if (e.target === modalBg) fechar();
      });
      
      const closeBtn = modalBox.querySelector('#modal-close-book');
      if (closeBtn) closeBtn.addEventListener('click', fechar);

      const inputSearch = modalBox.querySelector('#modal-book-search-input');
      const btnSearch = modalBox.querySelector('#modal-book-search-btn');
      const resultsContainer = modalBox.querySelector('#modal-book-results');

      async function executarBusca() {
        const query = inputSearch ? inputSearch.value.trim() : '';
        if (!query) return;

        resultsContainer.innerHTML = '<div style="font-size: 11.5px; font-family: monospace; color: #a1a1aa; text-align: center; padding: 20px 0;">🔍 Consultando acervo na nuvem...</div>';

        try {
          // Busca na Open Library API
          const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5`;
          const res = await fetch(url);
          const data = await res.json();

          if (!data.docs || data.docs.length === 0) {
            resultsContainer.innerHTML = '<div style="font-size: 11.5px; font-family: monospace; color: #fca5a5; text-align: center; padding: 20px 0;">Nenhum livro encontrado para essa busca.</div>';
            return;
          }

          resultsContainer.innerHTML = '';
          data.docs.forEach(doc => {
            const titulo = doc.title || 'Sem título';
            const autor = doc.author_name ? doc.author_name.join(', ') : 'Autor desconhecido';
            const paginas = doc.number_of_pages_median || 250;
            const ano = doc.first_publish_year || '';
            const coverId = doc.cover_i;
            const coverUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : 'https://images.pexels.com/photos/10254198/pexels-photo-10254198.jpeg';

            const itemCard = resultsContainer.createEl('div', {
              attr: {
                style: 'display: flex; gap: 10px; align-items: center; background: #181824; border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 8px; cursor: pointer; transition: background 0.12s ease;'
              }
            });

            itemCard.innerHTML = `
              <img src="${coverUrl}" style="width: 38px; height: 56px; border-radius: 4px; object-fit: cover; flex-shrink: 0;" />
              <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 2px;">
                <span style="font-size: 12.5px; font-weight: 700; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${titulo}</span>
                <span style="font-size: 11px; color: #a1a1aa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${autor}</span>
                <span style="font-size: 10px; font-family: monospace; color: #71717a;">${paginas} páginas ${ano ? `• ${ano}` : ''}</span>
              </div>
              <button class="abyssal-btn-action" style="font-size: 10px; padding: 4px 8px; flex-shrink: 0;">Salvar +</button>
            `;

            itemCard.addEventListener('click', async () => {
              // Cadastra o livro em 04_Leituras/Livros
              const cleanTitle = titulo.replace(/[\\/:*?"<>|]/g, '-').trim();
              const targetPath = `04_Leituras/Livros/${cleanTitle}.md`;
              
              if (!app.vault.getAbstractFileByPath("04_Leituras/Livros")) {
                await app.vault.createFolder("04_Leituras/Livros").catch(() => {});
              }

              const tplFile = app.vault.getAbstractFileByPath("99_Meta/Templates/Template - Livro.md");
              let content = "";
              if (tplFile) {
                const raw = await app.vault.read(tplFile);
                content = raw.replace(/{{title}}/g, cleanTitle)
                             .replace(/{{author}}/g, autor)
                             .replace(/{{category}}/g, "Geral")
                             .replace(/{{publisher}}/g, "")
                             .replace(/{{publishDate}}/g, String(ano))
                             .replace(/{{totalPage}}/g, String(paginas))
                             .replace(/{{coverUrl}}/g, coverUrl)
                             .replace(/{{description}}/g, `Livro cadastrado automaticamente via busca na nuvem (Open Library).`);
              } else {
                content = `---\ntitle: "${cleanTitle}"\nauthor: "${autor}"\ntotal_pages: ${paginas}\ncurrent_page: 0\nstatus: "Quero ler"\ncover: "${coverUrl}"\ntags: [leitura, livro]\n---\n\n# ${cleanTitle}\n\n`;
              }

              const newFile = await app.vault.create(targetPath, content);
              new Notice(`📖 Livro "${cleanTitle}" adicionado à estante!`);
              fechar();
              await app.workspace.openLinkText(newFile.path, "", false);
            });
          });

        } catch(err) {
          resultsContainer.innerHTML = `<div style="font-size: 11.5px; font-family: monospace; color: #fca5a5; text-align: center; padding: 20px 0;">Erro ao consultar nuvem: ${err.message || 'Verifique a conexão'}.</div>`;
        }
      }

      if (btnSearch) btnSearch.addEventListener('click', executarBusca);
      if (inputSearch) {
        inputSearch.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            executarBusca();
          }
        });
        setTimeout(() => inputSearch.focus(), 50);
      }
    }

    const btnBuscarNuvem = leiturasHeader.querySelector('#btn-buscar-livro-nuvem');
    if (btnBuscarNuvem) btnBuscarNuvem.addEventListener('click', abrirModalBuscaLivro);
  }
};

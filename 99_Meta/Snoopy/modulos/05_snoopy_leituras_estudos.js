/**
 * Snoopy Vault - Módulo 05: Vitrine de Estudos & Bookshelf de Leituras
 * Posicionado acima do Kanban com proporção 50/50:
 * - Esquerda: Estudos com atalho direto ao Painel e destaque da matéria da vez no ciclo.
 * - Direita: Bookshelf estilo KOReader com capas e busca de metadados na nuvem via Open Library API.
 *
 * @module modulos/05_snoopy_leituras_estudos
 */
return {
  id: 'snoopy_leituras_estudos',
  titulo: 'Estudos & Bookshelf de Leituras',

  /**
   * Ponto de entrada do ciclo de vida de renderização do Módulo 05.
   *
   * @param {object} ctx - Contexto compartilhado com os microsserviços do Vault.
   * @param {HTMLElement} ctx.root - Contêiner raiz DOM.
   * @param {object} ctx.app - Instância global do Obsidian.
   * @param {object} ctx.dv - API Dataview.
   * @param {string} ctx.todayStr - Data do dia em formato ISO (YYYY-MM-DD).
   * @param {function(HTMLElement, string, object=): HTMLElement} [ctx.renderIcon] - Helper de ícones.
   * @returns {Promise<void>}
   */
  async render(ctx) {
    const { root, app, dv, todayStr } = ctx;

    // CONTAINER PRINCIPAL: VITRINE 50/50 LADO A LADO
    const showcaseGrid = root.createEl('div', { cls: 'snoopy-showcase-grid' });

    // =========================================================================
    // 1. COLUNA ESQUERDA: ESTUDOS & CICLO ATIVO (ESTILO ESTUDEI)
    // =========================================================================
    const estudosCol = showcaseGrid.createEl('div', { 
      cls: 'snoopy-card-box', 
      attr: { style: 'display: flex; flex-direction: column; gap: 12px;' } 
    });

    const estudos = dv.pages('"03_Estudos"')
      .where(e => !e.file.name.includes("Template") && !e.file.name.includes("Painel"));

    const estudosHeader = estudosCol.createEl('div', { cls: 'snoopy-card-header' });

    estudosHeader.innerHTML = `
      <div class="snoopy-card-header-main">
        <a id="link-painel-estudos" class="snoopy-section-title-link" title="Abrir Subdashboard Completo de Estudos (Framework Estudei)">
          ${ctx.UIKit && ctx.UIKit.ICONS && ctx.UIKit.ICONS['graduation-cap'] ? `<span class="snoopy-icon" style="width: 16px; height: 16px; color: var(--snoopy-muted);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">${ctx.UIKit.ICONS['graduation-cap']}</svg></span>` : ''}
          ESTUDOS
          ${ctx.UIKit && ctx.UIKit.ICONS && ctx.UIKit.ICONS['arrow-up-right'] ? `<span class="snoopy-icon" style="width: 13px; height: 13px; opacity: 0.6;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13">${ctx.UIKit.ICONS['arrow-up-right']}</svg></span>` : ''}
        </a>
        <span class="snoopy-card-subtitle">Ciclo de estudos e matérias ativas</span>
      </div>
      <span class="snoopy-meta">${ctx.UIKit && typeof ctx.UIKit.pluralizar === 'function' ? ctx.UIKit.pluralizar(estudos.length, 'matéria', 'matérias') : `${estudos.length} matérias`}</span>
    `;

    const linkPainelEstudos = estudosHeader.querySelector('#link-painel-estudos');
    if (linkPainelEstudos) {
      linkPainelEstudos.addEventListener('click', (e) => {
        e.preventDefault();
        app.workspace.openLinkText("03_Estudos/Painel de Estudos.md", "", false);
      });
    }

    // 1.1. Métricas do Dia (Pomodoro + Histórico de Estudos)
    let minutosHoje = 0;
    let questoesHoje = 0;
    try {
      const cicloFile = app.vault.getAbstractFileByPath("99_Meta/ciclo-estudos.json");
      if (cicloFile) {
        const raw = await app.vault.read(cicloFile);
        const parsed = JSON.parse(raw);
        if (typeof parsed.disciplinaAtualIdx === 'number') cicloIdx = parsed.disciplinaAtualIdx;
        if (parsed.historicoDiario && parsed.historicoDiario[todayStr]) {
          minutosHoje += Number(parsed.historicoDiario[todayStr].minutosFoco) || 0;
          questoesHoje += Number(parsed.historicoDiario[todayStr].questoesFeitas) || 0;
        }
      }
    } catch(e) {}

    // Pomodoros de hoje da nota diária
    const dailyPageHoje = dv.page(`"01_Inbox/Diário/${todayStr}"`);
    if (dailyPageHoje && dailyPageHoje.pomodoros) {
      const pMin = Number(dailyPageHoje.pomodoros) * 25;
      if (pMin > minutosHoje) minutosHoje = pMin;
    }

    const minutosHojeTxt = minutosHoje >= 60 ? `${Math.floor(minutosHoje / 60)}h${minutosHoje % 60 ? `${minutosHoje % 60}m` : ''}` : `${minutosHoje}m`;

    // Mini Faixa de KPIs de Hoje
    const kpiRowEstudos = estudosCol.createEl('div', {
      attr: { style: 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px;' }
    });
    kpiRowEstudos.innerHTML = `
      <div style="background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-radius: 6px; padding: 6px 10px; display: flex; justify-content: space-between; align-items: center;">
        <span class="snoopy-meta">Foco Hoje</span>
        <span class="snoopy-meta" style="font-size: 15px; font-weight: 800; color: var(--text-normal);">${minutosHojeTxt}</span>
      </div>
      <div style="background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-radius: 6px; padding: 6px 10px; display: flex; justify-content: space-between; align-items: center;">
        <span class="snoopy-meta">Questões</span>
        <span class="snoopy-meta" style="font-size: 15px; font-weight: 800; color: var(--text-normal);">${questoesHoje}</span>
      </div>
    `;

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
          <span class="snoopy-micro" style="font-weight: 700; color: var(--interactive-accent, #60a5fa); text-transform: uppercase;">Matéria da Vez no Ciclo</span>
          <span style="font-size: 17px; font-weight: 700; color: var(--text-normal); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${materiaVez.title || materiaVez.file.name}</span>
          <span class="snoopy-meta">${materiaVez.disciplina || 'Geral'} • Status: ${materiaVez.status || 'Em Andamento'}</span>
        </div>
        <span class="snoopy-todo-source" style="font-size: 14px; padding: 2px 8px; flex-shrink: 0;">Abrir →</span>
      `;

      vezCard.addEventListener('click', () => {
        app.workspace.openLinkText(materiaVez.file.path, "", false);
      });
    }

    // Mini Grade de Matérias
    const subjectIcons = ['code-2', 'database', 'ruler', 'brain', 'microscope', 'settings'];
    const miniGrid = estudosCol.createEl('div', { 
      attr: { style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px;' } 
    });

    materiasLista.slice(0, 4).forEach((e, idx) => {
      const card = miniGrid.createEl('div', { 
        cls: 'snoopy-subject-card',
        attr: { style: 'padding: 8px 10px; cursor: pointer; display: flex; align-items: center; gap: 8px;' }
      });

      const iconBox = card.createEl('div', { attr: { style: 'display: flex; align-items: center; justify-content: center; color: var(--interactive-accent, #60a5fa);' } });
      if (ctx.renderIcon) ctx.renderIcon(iconBox, subjectIcons[idx % subjectIcons.length], { size: 18 });

      const infoBox = card.createEl('div', { attr: { style: 'overflow: hidden;' } });
      infoBox.createEl('div', { text: e.title || e.file.name, attr: { style: 'font-size: 15.5px; font-weight: 600; color: var(--text-normal); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;' } });
      infoBox.createEl('div', { text: e.status || 'Ativo', attr: { class: 'snoopy-meta', style: 'font-size: 13px;' } });

      card.addEventListener('click', () => app.workspace.openLinkText(e.file.path, "", false));
    });

    // =========================================================================
    // 2. COLUNA DIREITA: BOOKSHELF DE LEITURAS (ESTILO KOREADER)
    // =========================================================================
    const leiturasCol = showcaseGrid.createEl('div', { 
      cls: 'snoopy-card-box', 
      attr: { style: 'display: flex; flex-direction: column; gap: 12px;' } 
    });

    // Cálculo sutil da ofensiva de leitura para lembrete
    const dailyPagesLeitura = dv.pages('"01_Inbox/Diário"');
    let streakLeitura = 0;
    let pagsHoje = 0;
    const mapaDiasLeitura = new Map();
    dailyPagesLeitura.forEach(dp => {
      const dName = dp.file ? dp.file.name : '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(dName)) {
        const pags = Number(dp.paginas_lidas) || 0;
        mapaDiasLeitura.set(dName, pags);
        if (dName === todayStr) pagsHoje = pags;
      }
    });

    const shiftData = (dStr, delta) => {
      const p = dStr.split('-').map(Number);
      const d = new Date(p[0], p[1] - 1, p[2] + delta);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    let cursorStreak = (pagsHoje >= 20) ? todayStr : shiftData(todayStr, -1);
    while (true) {
      const p = mapaDiasLeitura.get(cursorStreak) || 0;
      if (p >= 20) {
        streakLeitura++;
        cursorStreak = shiftData(cursorStreak, -1);
      } else {
        break;
      }
    }

    const leiturasHeader = leiturasCol.createEl('div', { cls: 'snoopy-card-header' });

    leiturasHeader.innerHTML = `
      <div class="snoopy-card-header-main">
        <div class="snoopy-toolbar">
          <a id="link-painel-leituras" class="snoopy-bookshelf-open-btn" title="Abrir Subdashboard Completo de Leituras (KOReader Bookshelf)">
            ${ctx.UIKit && ctx.UIKit.ICONS && ctx.UIKit.ICONS['library'] ? `<span class="snoopy-icon" style="width: 14px; height: 14px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">${ctx.UIKit.ICONS['library']}</svg></span>` : ''}
            ESTANTE COMPLETA ↗
          </a>
          ${streakLeitura > 0 ? `<span class="snoopy-micro" style="padding: 1px 6px; border-radius: 4px; background: rgba(134, 239, 172, 0.1); color: #86efac; border: 1px solid rgba(134, 239, 172, 0.2); font-weight: 600;" title="${pagsHoje} págs lidas hoje">${streakLeitura}d ofensiva</span>` : ''}
        </div>
        <span class="snoopy-card-subtitle">Leituras ativas e biblioteca</span>
      </div>
      <button id="btn-buscar-livro-nuvem" class="snoopy-nav-pill-btn snoopy-btn-sm" title="Buscar metadados de livro na nuvem via API">+ BUSCAR NA NUVEM</button>
    `;

    const linkPainelLeituras = leiturasHeader.querySelector('#link-painel-leituras');
    if (linkPainelLeituras) {
      linkPainelLeituras.addEventListener('click', (e) => {
        e.preventDefault();
        app.workspace.openLinkText("04_Leituras/Painel de Leituras.md", "", false);
      });
    }

    const todosLivros = dv.pages('"04_Leituras/Livros"')
      .where(l => !l.file.name.includes("Template"))
      .sort(l => l.file.mtime, 'desc');

    const listaLivros = [...todosLivros];

    if (listaLivros.length === 0) {
      const emptyShelf = leiturasCol.createEl('div', {
        attr: { class: 'snoopy-meta', style: 'padding: 24px 0; text-align: center; width: 100%; font-size: 15px;' },
        text: 'Nenhum livro cadastrado. Use "+ BUSCAR NA NUVEM" para adicionar!'
      });
    } else {
      // Livro em Destaque (Preferencialmente em status "Lendo")
      const livroLendo = listaLivros.find(l => String(l.status).toLowerCase().includes('lendo')) || listaLivros[0];
      const curL = Number(livroLendo.current_page) || 0;
      const totL = Number(livroLendo.total_pages) || 100;
      const pctL = totL > 0 ? Math.round((curL / totL) * 100) : 0;
      const paginasRest = Math.max(0, totL - curL);

      // Mini Hero Box KOReader com Ações e Aproveitamento Total do Bloco
      const miniHero = leiturasCol.createEl('div', {
        cls: 'snoopy-bookshelf-card-hero'
      });

      const coverSrc = livroLendo.cover || "https://images.pexels.com/photos/10254198/pexels-photo-10254198.jpeg";
      miniHero.innerHTML = `
        <img src="${coverSrc}" style="width: 70px; height: 100px; border-radius: 6px; object-fit: cover; border: 1px solid var(--background-modifier-border); box-shadow: 0 4px 12px rgba(0,0,0,0.45); cursor: pointer;" onerror="this.src='https://images.pexels.com/photos/10254198/pexels-photo-10254198.jpeg';" />
        <div style="display: flex; flex-direction: column; gap: 4px; overflow: hidden; flex: 1;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="snoopy-micro" style="color: var(--interactive-accent, #60a5fa); font-weight: 700; text-transform: uppercase;">Lendo Agora</span>
            <span class="prio-badge prio-media" style="font-size: 11px; padding: 1px 7px;">${pctL}%</span>
          </div>
          <div style="font-size: 16px; font-weight: 700; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;">
            ${livroLendo.title || livroLendo.file.name}
          </div>
          <div style="font-size: 13px; font-style: italic; color: #a1a1aa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${livroLendo.author || 'Autor desconhecido'}
          </div>
          <div style="margin-top: 2px;">
            <div class="snoopy-prog-track" style="height: 5px; width: 100%;">
              <div class="snoopy-prog-fill" style="width: ${pctL}%; background: var(--interactive-accent, #60a5fa);"></div>
            </div>
            <div class="snoopy-meta" style="font-size: 11.5px; margin-top: 3px; display: flex; justify-content: space-between;">
              <span>${curL}/${totL} págs</span>
              <span>restam ${paginasRest} págs</span>
            </div>
          </div>
        </div>
      `;

      miniHero.onclick = (e) => {
        app.workspace.openLinkText(livroLendo.file.path, "", false);
      };

      // Mini Estante das outras capas abaixo OU Painel de Constância da Leitura
      const outrosLivros = listaLivros.filter(l => l.file.path !== livroLendo.file.path).slice(0, 4);
      if (outrosLivros.length > 0) {
        const shelf = leiturasCol.createEl('div', { 
          cls: 'snoopy-books-shelf',
          attr: { style: 'display: flex; gap: 10px; overflow-x: auto; padding-top: 2px;' }
        });

        outrosLivros.forEach(b => {
          const item = shelf.createEl('div', { 
            cls: 'snoopy-book-item',
            attr: { style: 'width: 58px; flex-shrink: 0; cursor: pointer;' }
          });
          item.addEventListener('click', () => app.workspace.openLinkText(b.file.path, "", false));

          const bImg = item.createEl('img', { cls: 'snoopy-book-cover', attr: { style: 'width: 58px; height: 84px; border-radius: 4px; object-fit: cover; border: 1px solid var(--background-modifier-border);' } });
          bImg.src = b.cover || "https://images.pexels.com/photos/10254198/pexels-photo-10254198.jpeg";
          bImg.onerror = () => { bImg.src = "https://images.pexels.com/photos/10254198/pexels-photo-10254198.jpeg"; };

          item.createEl('div', { 
            text: b.title || b.file.name, 
            attr: { style: 'font-size: 12.5px; font-weight: 600; color: var(--text-normal); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2; margin-top: 3px;' } 
          });
        });
      } else {
        // Aproveitamento do espaço inferior com banner indicativo do subdashboard completo
        const companionCard = leiturasCol.createEl('div', {
          attr: {
            style: 'background: rgba(13, 13, 18, 0.6); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; cursor: pointer;'
          }
        });
        companionCard.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <span class="snoopy-micro" style="color: #86efac; font-weight: 700; text-transform: uppercase;">Subdashboard de Leituras</span>
            <span style="font-size: 12px; color: #d4d4d8;">Desafios anuais, Heatmap 30 dias e Recomendações</span>
          </div>
          <span style="font-size: 11.5px; font-weight: 700; color: #60a5fa; display: flex; align-items: center; gap: 3px;">Abrir Painel →</span>
        `;
        companionCard.onclick = () => {
          app.workspace.openLinkText("04_Leituras/Painel de Leituras.md", "", false);
        };
      }
    }

    // =========================================================================
    // 3. MODAL DE BUSCA DE LIVROS NA NUVEM VIA API (KO-READER ASSISTANT)
    // =========================================================================
    function abrirModalBuscaLivro() {
      if (ctx.ModalFactory) {
        ctx.ModalFactory.abrir({
          maxWidth: '480px',
          htmlContent: `
            <div class="snoopy-card-header">
              <span class="snoopy-section-title">Buscar Livro no Bookshelf</span>
              <button class="snoopy-modal-close" title="Fechar"></button>
            </div>
            <div class="snoopy-modal-label">Digite o título ou autor (busca online via Open Library):</div>
            
            <div class="snoopy-toolbar">
              <input id="modal-book-search-input" class="snoopy-form-input" type="text" placeholder="Ex: Hábitos Atômicos, Clean Code..." style="flex: 1;">
              <button id="modal-book-search-btn" class="snoopy-btn-primary snoopy-btn-sm">Buscar</button>
            </div>

            <div id="modal-book-results" style="max-height: 320px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; margin-top: 4px; padding-right: 4px;">
              <div class="snoopy-meta" style="text-align: center; padding: 20px 0;">Digite o termo e clique em "Buscar".</div>
            </div>
          `,
          onMontar: (box, fechar) => {
            const inputSearch = box.querySelector('#modal-book-search-input');
            const btnSearch = box.querySelector('#modal-book-search-btn');
            const resultsContainer = box.querySelector('#modal-book-results');

            async function executarBusca() {
              const query = inputSearch ? inputSearch.value.trim() : '';
              if (!query) return;

              resultsContainer.innerHTML = '<div class="snoopy-meta" style="text-align: center; padding: 20px 0;">Consultando acervo na nuvem...</div>';

              try {
                const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5`;
                const res = await fetch(url);
                const data = await res.json();

                if (!data.docs || data.docs.length === 0) {
                  resultsContainer.innerHTML = '<div class="snoopy-meta" style="color: #fca5a5; text-align: center; padding: 20px 0;">Nenhum livro encontrado para essa busca.</div>';
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
                      <span style="font-size: 15.5px; font-weight: 700; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${titulo}</span>
                      <span style="font-size: 14px; color: #a1a1aa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${autor}</span>
                      <span class="snoopy-micro" style="color: #71717a;">${paginas} páginas ${ano ? `• ${ano}` : ''}</span>
                    </div>
                    <button class="snoopy-btn-action snoopy-btn-sm" style="flex-shrink: 0;">Salvar +</button>
                  `;

                  itemCard.addEventListener('click', async () => {
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
                    new Notice(`Livro "${cleanTitle}" adicionado à estante!`);
                    fechar();
                    await app.workspace.openLinkText(newFile.path, "", false);
                  });
                });

              } catch(err) {
                resultsContainer.innerHTML = `<div class="snoopy-meta" style="color: #fca5a5; text-align: center; padding: 20px 0;">Erro ao consultar nuvem: ${err.message || 'Verifique a conexão'}.</div>`;
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
        });
      }
    }

    const btnBuscarNuvem = leiturasHeader.querySelector('#btn-buscar-livro-nuvem');
    if (btnBuscarNuvem) btnBuscarNuvem.addEventListener('click', abrirModalBuscaLivro);
  }
};

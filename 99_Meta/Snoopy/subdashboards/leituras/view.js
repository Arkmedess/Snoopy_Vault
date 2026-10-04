/**
 * Snoopy Vault - Subdashboard Especializado de Leituras
 * Fiel à interface do Bookshelf do KOReader (AndyHazz/bookshelf.koplugin):
 * - Hero Card no topo com capa 3D, autor em itálico, sinopse, progresso e páginas restantes
 * - Barra de navegação e-reader: Todos, Lendo, Quero Ler, Lidos e Busca na Nuvem
 * - The Shelf Grid: capas proporcionais com marcadores de fita (ribbon) e barras embutidas
 * - Atualização rápida de páginas lidas e busca de metadados na nuvem
 */

const root = dv.container.createEl('div', { cls: 'abyssal-container' });

// ---------------------------------------------------------------------------
// 1. CARREGAMENTO DOS LIVROS DO VAULT
// ---------------------------------------------------------------------------
const rawLivros = dv.pages('"04_Leituras/Livros"')
  .where(l => l.file && !l.file.name.includes("Template"))
  .sort(l => l.file.mtime, 'desc');

const listaLivros = [...rawLivros];

let abaAtiva = 'todos'; // 'todos' | 'lendo' | 'quero_ler' | 'lidos'
let livroSelecionadoPath = listaLivros.length > 0 ? listaLivros[0].file.path : null;

// Encontra o livro prioritário para o Hero Box (preferencialmente um que esteja "Lendo")
const livroLendo = listaLivros.find(l => String(l.status).toLowerCase().includes('lendo'));
if (livroLendo) {
  livroSelecionadoPath = livroLendo.file.path;
}

// ---------------------------------------------------------------------------
// 2. MODAIS AUXILIARES (ATUALIZAR PÁGINAS & BUSCAR NA NUVEM)
// ---------------------------------------------------------------------------

// Modal de Atualização de Páginas Lidas
function abrirModalProgresso(livro) {
  const modalBg = document.createElement('div');
  modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';
  
  const modalBox = document.createElement('div');
  modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 380px; width: 100%; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 12px; font-family: sans-serif;';

  const curPag = Number(livro.current_page) || 0;
  const totPag = Number(livro.total_pages) || 100;

  modalBox.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span style="font-size: 14px; font-weight: bold; color: #ffffff;">📖 Atualizar Progresso</span>
      <button id="modal-close-prog" style="background: none; border: none; color: #71717a; cursor: pointer; font-size: 14px;">✕</button>
    </div>
    <div style="font-size: 12px; color: #a1a1aa;">${livro.title || livro.file.name}</div>

    <div style="display: flex; gap: 8px;">
      <div style="flex: 1;">
        <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Página Atual:</div>
        <input id="modal-prog-cur" type="number" min="0" max="${totPag}" value="${curPag}" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11.5px; outline: none;">
      </div>
      <div style="flex: 1;">
        <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Total de Páginas:</div>
        <input id="modal-prog-tot" type="number" min="1" value="${totPag}" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11.5px; outline: none;">
      </div>
    </div>

    <div>
      <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Status da Leitura:</div>
      <select id="modal-prog-status" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11.5px; outline: none;">
        <option value="Lendo" ${livro.status === 'Lendo' ? 'selected' : ''}>Lendo</option>
        <option value="Quero ler" ${livro.status === 'Quero ler' ? 'selected' : ''}>Quero ler</option>
        <option value="Lido" ${livro.status === 'Lido' ? 'selected' : ''}>Lido (Concluído)</option>
        <option value="Pausado" ${livro.status === 'Pausado' ? 'selected' : ''}>Pausado</option>
      </select>
    </div>

    <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px;">
      <button id="modal-cancel-prog" class="abyssal-btn-action" style="font-size: 11px;">Cancelar</button>
      <button id="modal-save-prog" class="abyssal-btn-primary" style="font-size: 11px;">Salvar Progresso</button>
    </div>
  `;

  modalBg.appendChild(modalBox);
  document.body.appendChild(modalBg);

  const fechar = () => { if (modalBg.parentNode) document.body.removeChild(modalBg); };
  modalBg.addEventListener('click', (e) => { if (e.target === modalBg) fechar(); });
  modalBox.querySelector('#modal-close-prog').onclick = fechar;
  modalBox.querySelector('#modal-cancel-prog').onclick = fechar;

  modalBox.querySelector('#modal-save-prog').onclick = async () => {
    const novoCur = parseInt(modalBox.querySelector('#modal-prog-cur').value, 10) || 0;
    const novoTot = parseInt(modalBox.querySelector('#modal-prog-tot').value, 10) || totPag;
    const novoStatus = modalBox.querySelector('#modal-prog-status').value;

    const file = app.vault.getAbstractFileByPath(livro.file.path);
    if (file) {
      const raw = await app.vault.read(file);
      let updated = raw;

      if (/current_page:\s*\d+/.test(updated)) {
        updated = updated.replace(/current_page:\s*\d+/, `current_page: ${novoCur}`);
      } else if (updated.startsWith('---')) {
        updated = updated.replace(/^---\n/, `---\ncurrent_page: ${novoCur}\n`);
      }

      if (/total_pages:\s*\d+/.test(updated)) {
        updated = updated.replace(/total_pages:\s*\d+/, `total_pages: ${novoTot}`);
      }

      if (/status:\s*["'][^"']+["']/.test(updated)) {
        updated = updated.replace(/status:\s*["'][^"']+["']/, `status: "${novoStatus}"`);
      }

      // Se atingiu o total de páginas, marca automaticamente como Lido
      if (novoCur >= novoTot && novoStatus !== 'Lido') {
        updated = updated.replace(/status:\s*["'][^"']+["']/, `status: "Lido"`);
      }

      await app.vault.modify(file, updated);
      new Notice(`📖 Progresso atualizado: ${novoCur}/${novoTot} págs (${Math.round((novoCur/novoTot)*100)}%)`);
      fechar();
      renderBookshelfCompleto();
    }
  };
}

// Modal de Busca na Nuvem (Open Library API)
function abrirModalBuscaNuvem() {
  const modalBg = document.createElement('div');
  modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';
  
  const modalBox = document.createElement('div');
  modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 480px; width: 100%; max-height: 85vh; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 12px; font-family: sans-serif;';
  
  modalBox.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span style="font-size: 14px; font-weight: bold; color: #ffffff;">📖 Buscar Livro na Nuvem (Bookshelf)</span>
      <button id="modal-close-search" style="background: none; border: none; color: #71717a; cursor: pointer; font-size: 14px;">✕</button>
    </div>
    <div style="font-size: 11px; font-family: monospace; color: #a1a1aa;">Digite o título ou autor (busca online Open Library):</div>
    
    <div style="display: flex; gap: 8px;">
      <input id="modal-search-input" type="text" placeholder="Ex: Hábitos Atômicos, Clean Code..." style="flex: 1; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 8px; color: #ffffff; font-size: 12px; outline: none;">
      <button id="modal-search-btn" class="abyssal-btn-primary" style="font-size: 11px; padding: 6px 14px;">Buscar</button>
    </div>

    <div id="modal-search-results" style="max-height: 320px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; margin-top: 4px; padding-right: 4px;">
      <div style="font-size: 11.5px; font-family: monospace; color: #71717a; text-align: center; padding: 20px 0;">Digite o termo e clique em "Buscar".</div>
    </div>
  `;
  
  modalBg.appendChild(modalBox);
  document.body.appendChild(modalBg);
  
  const fechar = () => { if (modalBg.parentNode) document.body.removeChild(modalBg); };
  modalBg.addEventListener('click', (e) => { if (e.target === modalBg) fechar(); });
  modalBox.querySelector('#modal-close-search').onclick = fechar;

  const inputSearch = modalBox.querySelector('#modal-search-input');
  const btnSearch = modalBox.querySelector('#modal-search-btn');
  const resultsContainer = modalBox.querySelector('#modal-search-results');

  async function executarBusca() {
    const query = inputSearch ? inputSearch.value.trim() : '';
    if (!query) return;

    resultsContainer.innerHTML = '<div style="font-size: 11.5px; font-family: monospace; color: #a1a1aa; text-align: center; padding: 20px 0;">🔍 Consultando acervo na nuvem...</div>';

    try {
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
          livroSelecionadoPath = newFile.path;
          renderBookshelfCompleto();
        });
      });

    } catch(err) {
      resultsContainer.innerHTML = `<div style="font-size: 11.5px; font-family: monospace; color: #fca5a5; text-align: center; padding: 20px 0;">Erro ao consultar nuvem: ${err.message || 'Verifique a conexão'}.</div>`;
    }
  }

  if (btnSearch) btnSearch.onclick = executarBusca;
  if (inputSearch) {
    inputSearch.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        executarBusca();
      }
    };
    setTimeout(() => inputSearch.focus(), 50);
  }
}

// ---------------------------------------------------------------------------
// 3. RENDERIZAÇÃO PRINCIPAL DO BOOKSHELF KOREADER (PRINT 4)
// ---------------------------------------------------------------------------
function renderBookshelfCompleto() {
  root.innerHTML = '';

  // 3.1. CABEÇALHO SUPERIOR (COM VOLTAR AO HOME E BUSCA)
  const topNav = root.createEl('div', {
    attr: { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 12px 18px; background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 10px; flex-wrap: wrap; gap: 12px;' }
  });

  topNav.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <button id="btn-back-home" class="abyssal-btn-action" style="font-size: 11px; padding: 4px 10px;">← HOME</button>
      <div>
        <div style="font-size: 15px; font-weight: 700; color: var(--text-normal); text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 8px;">
          <span>📖</span> BOOKSHELF KO-READER • ESTANTE PESSOAL
        </div>
        <div style="font-size: 11px; font-family: monospace; color: var(--text-muted);">${listaLivros.length} livros no acervo</div>
      </div>
    </div>

    <div style="display: flex; align-items: center; gap: 8px;">
      <button id="btn-add-nuvem" class="abyssal-btn-primary" style="font-size: 11px; padding: 4px 12px;">+ BUSCAR NA NUVEM</button>
    </div>
  `;

  topNav.querySelector('#btn-back-home').onclick = () => app.workspace.openLinkText("00_Home/Home.md", "", false);
  topNav.querySelector('#btn-add-nuvem').onclick = abrirModalBuscaNuvem;

  // 3.2. HERO CARD: DESTAQUE DO LIVRO NO TOPO (EXATAMENTE COMO O PRINT 4)
  const livroDestaque = listaLivros.find(l => l.file.path === livroSelecionadoPath) || listaLivros[0];

  if (livroDestaque) {
    const cur = Number(livroDestaque.current_page) || 0;
    const tot = Number(livroDestaque.total_pages) || 100;
    const pct = tot > 0 ? Math.round((cur / tot) * 100) : 0;
    const paginasRestantes = Math.max(0, tot - cur);
    // Estimativa KOReader: ~1.5 min por página
    const horasRestantes = (paginasRestantes * 1.5 / 60).toFixed(1);

    const heroBox = root.createEl('div', {
      attr: {
        style: 'background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-radius: 12px; padding: 20px; margin-bottom: 20px; display: grid; grid-template-columns: 140px 1fr; gap: 22px; align-items: start;'
      }
    });

    // Coluna Esquerda: Capa 3D com perspectiva
    const heroLeft = heroBox.createEl('div', { attr: { style: 'position: relative;' } });
    const heroImg = heroLeft.createEl('img', {
      attr: {
        style: 'width: 140px; height: 204px; border-radius: 6px; object-fit: cover; box-shadow: -4px 6px 18px rgba(0,0,0,0.45); border: 1px solid var(--background-modifier-border);'
      }
    });
    heroImg.src = livroDestaque.cover || "https://images.pexels.com/photos/10254198/pexels-photo-10254198.jpeg";
    heroImg.onerror = () => { heroImg.src = "https://images.pexels.com/photos/10254198/pexels-photo-10254198.jpeg"; };

    // Coluna Direita: Informações Editoriais Estilo KOReader
    const heroRight = heroBox.createEl('div', { attr: { style: 'display: flex; flex-direction: column; gap: 8px;' } });
    
    // Título e Autor
    heroRight.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
        <div>
          <div style="font-size: 20px; font-weight: 800; color: var(--text-normal); line-height: 1.25; letter-spacing: -0.01em;">
            ${livroDestaque.title || livroDestaque.file.name}
          </div>
          <div style="font-size: 13.5px; font-style: italic; color: var(--text-muted); margin-top: 3px;">
            ${livroDestaque.author || 'Autor desconhecido'}
          </div>
        </div>
        <span class="prio-badge prio-media" style="font-size: 10.5px; padding: 2px 7px;">
          ${livroDestaque.status || 'Quero ler'}
        </span>
      </div>

      <!-- Sinopse / Blurb Editorial -->
      <div style="font-size: 12.5px; color: var(--text-muted); line-height: 1.5; max-height: 72px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; margin-top: 4px;">
        ${livroDestaque.description || 'Sinopse editorial não informada. Clique em "Abrir Nota" para preencher suas lições e notas de leitura.'}
      </div>

      <!-- Barra de Progresso Estilo KOReader -->
      <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 4px;">
        <div style="display: flex; justify-content: space-between; align-items: baseline; font-size: 12px; font-family: monospace;">
          <span style="font-weight: 800; color: var(--text-normal); font-size: 14px;">${pct}%</span>
          <span style="color: var(--text-muted);">${cur}/${tot} páginas • Restam ~${horasRestantes}h (${paginasRestantes} págs)</span>
        </div>
        <div class="abyssal-prog-track" style="height: 7px; width: 100%; border-radius: 99px;">
          <div class="abyssal-prog-fill" style="width: ${pct}%; background: var(--text-normal); border-radius: 99px;"></div>
        </div>
      </div>

      <!-- Ações do Livro -->
      <div style="display: flex; gap: 10px; margin-top: 8px;">
        <button id="btn-hero-open" class="abyssal-btn-primary" style="font-size: 11.5px; padding: 6px 14px;">▶ Continuar Lendo / Abrir</button>
        <button id="btn-hero-prog" class="abyssal-btn-action" style="font-size: 11.5px; padding: 6px 12px;">✏️ Atualizar Página</button>
      </div>
    `;

    heroRight.querySelector('#btn-hero-open').onclick = () => app.workspace.openLinkText(livroDestaque.file.path, "", false);
    heroRight.querySelector('#btn-hero-prog').onclick = () => abrirModalProgresso(livroDestaque);
  }

  // 3.3. BARRA DE NAVEGAÇÃO E-READER (TABS ESTILO PRINT 4)
  const navTabsRow = root.createEl('div', {
    attr: {
      style: 'display: flex; align-items: center; border-bottom: 2px solid var(--background-modifier-border); margin-bottom: 18px; padding-bottom: 2px; gap: 6px;'
    }
  });

  const abasConfig = [
    { id: 'todos', label: 'HOME (Todos)' },
    { id: 'lendo', label: 'RECENT (Lendo)' },
    { id: 'quero_ler', label: 'QUERO LER' },
    { id: 'lidos', label: 'FAVOURITES (Lidos)' }
  ];

  abasConfig.forEach(aba => {
    const isAtiva = abaAtiva === aba.id;
    const btnAba = navTabsRow.createEl('button', {
      cls: `abyssal-btn-mode ${isAtiva ? 'active' : ''}`,
      attr: {
        style: `font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 6px 14px; border-radius: 4px; ${isAtiva ? 'background: var(--text-normal); color: var(--background-primary);' : ''}`
      },
      text: aba.label
    });
    btnAba.onclick = () => {
      abaAtiva = aba.id;
      renderBookshelfCompleto();
    };
  });

  // 3.4. THE SHELF GRID: A ESTANTE DE LIVROS DO KOREADER (PRINT 4)
  const shelfSection = root.createEl('div');

  let livrosFiltrados = listaLivros;
  if (abaAtiva === 'lendo') {
    livrosFiltrados = listaLivros.filter(l => String(l.status).toLowerCase().includes('lendo'));
  } else if (abaAtiva === 'quero_ler') {
    livrosFiltrados = listaLivros.filter(l => String(l.status).toLowerCase().includes('quero'));
  } else if (abaAtiva === 'lidos') {
    livrosFiltrados = listaLivros.filter(l => String(l.status).toLowerCase().includes('lido'));
  }

  if (livrosFiltrados.length === 0) {
    shelfSection.innerHTML = `
      <div style="font-size: 12.5px; font-family: monospace; color: var(--text-muted); text-align: center; padding: 40px 0;">
        Nenhum livro encontrado nesta categoria. Use o botão "+ BUSCAR NA NUVEM" para alimentar seu acervo!
      </div>
    `;
    return;
  }

  const gridShelf = shelfSection.createEl('div', {
    attr: {
      style: 'display: grid; grid-template-columns: repeat(auto-fill, minmax(135px, 1fr)); gap: 20px;'
    }
  });

  livrosFiltrados.forEach(b => {
    const isSelecionado = livroDestaque && b.file.path === livroDestaque.file.path;
    const cur = Number(b.current_page) || 0;
    const tot = Number(b.total_pages) || 100;
    const pct = tot > 0 ? Math.round((cur / tot) * 100) : 0;
    const isLido = String(b.status).toLowerCase().includes('lido') || pct >= 100;

    const bookItem = gridShelf.createEl('div', {
      attr: {
        style: `display: flex; flex-direction: column; cursor: pointer; position: relative; border-radius: 6px; padding: 4px; transition: transform 0.15s ease; ${isSelecionado ? 'outline: 2px solid var(--interactive-accent, #60a5fa);' : ''}`
      }
    });

    // Ao clicar, seleciona o livro no Hero Box superior
    bookItem.onclick = () => {
      livroSelecionadoPath = b.file.path;
      renderBookshelfCompleto();
    };

    // Capa com molde KOReader
    const coverWrapper = bookItem.createEl('div', {
      attr: { style: 'position: relative; width: 100%; height: 195px; border-radius: 5px; overflow: hidden; background: #161622; border: 1px solid var(--background-modifier-border); box-shadow: 0 4px 12px rgba(0,0,0,0.3);' }
    });

    if (b.cover && b.cover.startsWith('http')) {
      const img = coverWrapper.createEl('img', {
        attr: { style: 'width: 100%; height: 100%; object-fit: cover;' }
      });
      img.src = b.cover;
      img.onerror = () => {
        img.style.display = 'none';
        coverWrapper.appendChild(criarCapaTipografica(b));
      };
    } else {
      coverWrapper.appendChild(criarCapaTipografica(b));
    }

    // Marcador de Fita / Ribbon na base inferior (KOReader Style)
    if (isLido) {
      const ribbon = coverWrapper.createEl('div', {
        attr: {
          style: 'position: absolute; top: 0; right: 8px; width: 22px; height: 26px; background: #86efac; color: #000; font-size: 11px; font-weight: bold; display: flex; align-items: center; justify-content: center; clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 75%, 0 100%);'
        },
        text: '✓'
      });
    } else {
      const ribbon = coverWrapper.createEl('div', {
        attr: {
          style: 'position: absolute; bottom: 0; left: 8px; width: 18px; height: 18px; background: rgba(0,0,0,0.7); color: #fff; font-size: 10px; display: flex; align-items: center; justify-content: center; border-radius: 3px 3px 0 0;'
        },
        text: '🔖'
      });
    }

    // Barra de Progresso Embutida na Base da Capa (KOReader Style)
    const baseProgress = coverWrapper.createEl('div', {
      attr: {
        style: 'position: absolute; bottom: 0; left: 0; right: 0; height: 5px; background: rgba(0,0,0,0.6);'
      }
    });
    baseProgress.createEl('div', {
      attr: {
        style: `height: 100%; width: ${pct}%; background: ${isLido ? '#86efac' : '#ffffff'};`
      }
    });

    // Legenda abaixo da capa
    const metaBottom = bookItem.createEl('div', { attr: { style: 'margin-top: 6px; display: flex; flex-direction: column; gap: 2px;' } });
    metaBottom.createEl('span', {
      text: b.title || b.file.name,
      attr: { style: 'font-size: 12px; font-weight: 700; color: var(--text-normal); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;' }
    });
    metaBottom.createEl('span', {
      text: b.author || 'Autor desconhecido',
      attr: { style: 'font-size: 10.5px; font-family: monospace; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;' }
    });
  });

  // 3.5. RODAPÉ DE PAGINAÇÃO ESTILO E-READER
  const pagination = root.createEl('div', {
    attr: {
      style: 'display: flex; justify-content: center; align-items: center; gap: 14px; margin-top: 30px; padding-top: 14px; border-top: 1px solid var(--background-modifier-border); font-size: 12px; font-family: monospace; color: var(--text-muted);'
    }
  });
  pagination.innerHTML = `
    <span style="opacity: 0.5; cursor: default;">«</span>
    <span style="opacity: 0.5; cursor: default;">‹</span>
    <span>Page 1 of 1</span>
    <span style="opacity: 0.5; cursor: default;">›</span>
    <span style="opacity: 0.5; cursor: default;">»</span>
  `;
}

// Capa Tipográfica Clássica de E-Reader quando não houver imagem
function criarCapaTipografica(livro) {
  const box = document.createElement('div');
  box.style.cssText = 'width: 100%; height: 100%; padding: 14px 10px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; border: 2px solid rgba(255,255,255,0.12); box-sizing: border-box; background: #1a1a26;';
  box.innerHTML = `
    <div style="font-size: 11px; font-weight: 800; color: #ffffff; line-height: 1.25; margin-bottom: 6px; max-height: 60px; overflow: hidden;">
      ${livro.title || livro.file.name}
    </div>
    <div style="font-size: 9.5px; font-family: monospace; color: #a1a1aa; font-style: italic;">
      ${livro.author || 'Autor'}
    </div>
    <div style="margin-top: 10px; font-size: 10px; opacity: 0.4;">❖</div>
  `;
  return box;
}

renderBookshelfCompleto();

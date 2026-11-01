/**
 * Snoopy Vault - Orquestrador do Bookshelf (Subdashboard de Leituras)
 * Implementa o Reading Studio Completo com Ecossistema Central do Snoopy:
 * - ModuleLoader com Cache V8 por mtime
 * - Lifecycle seguro contra vazamento de memória DOM
 * - Microsserviços: UIKit, DateUtils, VaultStore, ModalFactory, renderIcon Lucide
 * - Histórico de 30 Dias e Ofensiva unificada de Leitura
 * - Dual Workspace: A Estante (The Shelf Grid) + Reader Companion em Abas
 *
 * @module subdashboards/leituras/view
 */

async function renderLeituras(dv, app) {
  // Carregamento dinâmico do ModuleLoader central
  let ModuleLoader = null;
  try {
    const _mlFile = app.vault.getAbstractFileByPath("99_Meta/Snoopy/core/module_loader.js");
    if (_mlFile) {
      const _mlCode = await app.vault.read(_mlFile);
      ModuleLoader = (new Function(_mlCode))();
    }
  } catch (e) {
    console.warn("[Snoopy Leituras] Falha ao carregar core/module_loader.js:", e);
  }

  if (!ModuleLoader) {
    ModuleLoader = class {
      static async carregar(app, path) {
        const f = app.vault.getAbstractFileByPath ? app.vault.getAbstractFileByPath(path) : null;
        if (!f) return null;
        const c = await app.vault.read(f);
        return (new Function(c))();
      }
    };
  }

  // Carregamento dos microsserviços centrais via ModuleLoader
  const DateUtils = await ModuleLoader.carregar(app, "99_Meta/Snoopy/core/date_utils.js");
  const VaultStore = await ModuleLoader.carregar(app, "99_Meta/Snoopy/core/vault_store.js");
  const ModalFactory = await ModuleLoader.carregar(app, "99_Meta/Snoopy/core/modal_factory.js");
  const UIKit = await ModuleLoader.carregar(app, "99_Meta/Snoopy/core/ui_kit.js");
  let Lifecycle = await ModuleLoader.carregar(app, "99_Meta/Snoopy/core/lifecycle.js");

  if (!Lifecycle) {
    Lifecycle = class {
      static onDispose() { return () => {}; }
      static dispose() {}
      static contagem() { return 0; }
    };
  }

  // Limpa ouvintes e timers registrados na renderização anterior do Bookshelf
  Lifecycle.dispose('bookshelf');

  // Submódulos do Bookshelf
  const ModaisLeiturasClass = await ModuleLoader.carregar(app, "99_Meta/Snoopy/subdashboards/leituras/modais.js");
  const BookshelfView = await ModuleLoader.carregar(app, "99_Meta/Snoopy/subdashboards/leituras/bookshelf_view.js");
  const GamificacaoLeituras = await ModuleLoader.carregar(app, "99_Meta/Snoopy/subdashboards/leituras/gamificacao.js");

  const root = dv.container.createEl('div', {
    cls: 'snoopy-container',
    attr: { style: 'padding: 16px 16px 32px 16px; box-sizing: border-box;' }
  });

  if (!ModaisLeiturasClass || !BookshelfView || !GamificacaoLeituras) {
    root.innerHTML = `<div class="snoopy-meta" style="color: #fca5a5; padding: 20px;">Erro ao carregar os submódulos do Bookshelf. Verifique os caminhos do Snoopy Vault.</div>`;
    return;
  }

  /**
   * Renderiza um ícone vetorial SVG do catálogo Lucide nativo dentro de um contêiner DOM.
   * Utiliza UIKit.renderIcon() ou UIKit.ICONS.
   *
   * @param {HTMLElement} container - Elemento pai onde o ícone será inserido.
   * @param {string} iconName - Identificador do ícone no catálogo do UIKit.
   * @param {object} [options] - Opções de estilização e dimensões.
   * @param {number} [options.size=14] - Largura e altura em pixels.
   * @param {string} [options.color='currentColor'] - Cor do traçado SVG (stroke).
   * @param {string} [options.cls=''] - Classes CSS adicionais.
   * @returns {HTMLElement} Elemento span contendo o SVG renderizado.
   */
  function renderIcon(container, iconName, { size = 14, color = 'currentColor', cls = '' } = {}) {
    if (UIKit && typeof UIKit.renderIcon === 'function') {
      return UIKit.renderIcon(container, iconName, { size, color, cls });
    }
    const span = container.createEl('span', { cls: `snoopy-icon ${cls}`.trim() });
    const innerSvg = (UIKit && UIKit.ICONS && UIKit.ICONS[iconName]) || '<circle cx="12" cy="12" r="8"/>';
    span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="${size}" height="${size}" style="display: block;">${innerSvg}</svg>`;
    if (size) {
      span.style.width = `${size}px`;
      span.style.height = `${size}px`;
    }
    if (color && color !== 'currentColor') {
      span.style.color = color;
    }
    return span;
  }

  // Estado da interface
  let modoVisualizacao = 'estante'; // 'estante' | 'dashboard'
  let abaAtiva = 'todos';           // 'todos' | 'lendo' | 'quero_ler' | 'sintetizando' | 'lidos'
  let termoBusca = '';
  let generoFiltroAtivo = 'Todos';
  let livroSelecionadoPath = null;
  let metaDiariaPaginas = typeof window !== 'undefined' && window.snoopyMetaDiariaLeitura ? window.snoopyMetaDiariaLeitura : 25;

  const now = new Date();
  const padTime = (n) => String(n).padStart(2, '0');
  const todayStr = `${now.getFullYear()}-${padTime(now.getMonth() + 1)}-${padTime(now.getDate())}`;

  const modais = new ModaisLeiturasClass({
    app,
    onReload: () => renderBookshelf(),
    onSelectLivro: (path) => {
      livroSelecionadoPath = path;
      renderBookshelf();
    }
  });

  function carregarLivros() {
    return dv.pages('"04_Leituras/Livros"')
      .where(l => l.file && !l.file.name.includes("Template"))
      .sort(l => l.file.mtime, 'desc');
  }

  function carregarMateriasEstudo() {
    return dv.pages('"03_Estudos"')
      .where(e => e.file && !e.file.name.includes("Template") && !e.file.name.includes("Painel"));
  }

  function carregarNotasDiarias() {
    return dv.pages('"01_Inbox/Diário"')
      .where(d => d.date || (d.file && d.file.name.match(/^\d{4}-\d{2}-\d{2}$/)));
  }

  async function renderBookshelf() {
    root.innerHTML = '';
    const listaLivros = [...carregarLivros()];
    const materiasEstudo = [...carregarMateriasEstudo()];
    const notasDiarias = [...carregarNotasDiarias()];

    // Seleção padrão inteligente: primeiro que estiver "lendo" ou primeiro do acervo
    if (!livroSelecionadoPath && listaLivros.length > 0) {
      const livroLendo = listaLivros.find(l => String(l.status).toLowerCase().includes('lendo'));
      livroSelecionadoPath = livroLendo ? livroLendo.file.path : listaLivros[0].file.path;
    }

    // Calcula agregação dos últimos 30 dias para o Heatmap de Constância
    const historico30Dias = GamificacaoLeituras.calcularHistorico30Dias(notasDiarias, todayStr, metaDiariaPaginas);
    const estagioLeitor = GamificacaoLeituras.calcularEstagioLeitor(historico30Dias.totalPaginas, historico30Dias.streak);

    // Monta contexto completo compartilhado com os submódulos
    const ctx = {
      root,
      app,
      dv,
      now,
      todayStr,
      metaDiariaPaginas,
      historico30Dias,
      estagioLeitor,
      DateUtils,
      VaultStore,
      ModalFactory,
      Lifecycle,
      UIKit,
      renderIcon,
      modais,
      gamificacao: GamificacaoLeituras,
      events: (typeof window !== 'undefined' ? window._snoopyEvents : null),
      onDefinirMetaDiaria: (novaMeta) => {
        metaDiariaPaginas = novaMeta;
        if (typeof window !== 'undefined') window.snoopyMetaDiariaLeitura = novaMeta;
        renderBookshelf();
      },
      onSelectLivro: (path) => {
        livroSelecionadoPath = path;
        renderBookshelf();
      }
    };

    // 1. Barra de Comandos Superior Padronizada (Header Moderno Anthropic Style)
    const topNav = root.createEl('div', { cls: 'snoopy-card-header', attr: { style: 'margin-bottom: 18px;' } });

    const leftNav = topNav.createEl('div', { cls: 'snoopy-toolbar' });
    const btnHome = leftNav.createEl('button', { cls: 'snoopy-btn-action snoopy-btn-sm', attr: { id: 'btn-back-home', title: 'Voltar ao Painel Home' } });
    renderIcon(btnHome, 'arrow-left', { size: 12, cls: 'btn-icon-pad' });
    btnHome.createEl('span', { text: 'HOME' });
    btnHome.onclick = () => app.workspace.openLinkText("00_Home/Home.md", "", false);

    const titleGroup = leftNav.createEl('div');
    const titleRow = titleGroup.createEl('div', { attr: { style: 'display: flex; align-items: center; gap: 8px;' } });
    titleRow.createEl('span', { cls: 'snoopy-section-title', text: 'BOOKSHELF STUDIO' });
    if (historico30Dias && historico30Dias.streak > 0) {
      titleRow.createEl('span', {
        cls: 'snoopy-micro',
        attr: { style: 'padding: 1px 6px; border-radius: 4px; background: rgba(134, 239, 172, 0.1); color: #86efac; border: 1px solid rgba(134, 239, 172, 0.2); font-weight: 600;' },
        text: `${historico30Dias.streak}d ofensiva`
      });
    }
    titleGroup.createEl('div', { cls: 'snoopy-meta', text: `${listaLivros.length} livros no acervo • Meta: ${metaDiariaPaginas} págs/dia` });

    const rightNav = topNav.createEl('div', { cls: 'snoopy-toolbar', attr: { style: 'gap: 10px;' } });

    // Switcher Estante | Dashboard no padrão segment control
    const toggleGroup = rightNav.createEl('div', {
      cls: 'snoopy-toggle-group',
      attr: { style: 'display: inline-flex; background: var(--background-secondary); border: 1px solid var(--snoopy-border); border-radius: 6px; padding: 2px;' }
    });

    const btnToggleEstante = toggleGroup.createEl('button', {
      cls: `snoopy-btn-mode snoopy-btn-sm ${modoVisualizacao === 'estante' ? 'active' : ''}`,
      text: 'Estante'
    });
    btnToggleEstante.onclick = () => {
      modoVisualizacao = 'estante';
      renderBookshelf();
    };

    const btnToggleDash = toggleGroup.createEl('button', {
      cls: `snoopy-btn-mode snoopy-btn-sm ${modoVisualizacao === 'dashboard' ? 'active' : ''}`,
      text: 'Dashboard'
    });
    btnToggleDash.onclick = () => {
      modoVisualizacao = 'dashboard';
      renderBookshelf();
    };

    // Botão Primário: Buscar na Nuvem
    const btnAddNuvem = rightNav.createEl('button', {
      cls: 'snoopy-btn-primary snoopy-btn-sm',
      attr: { id: 'btn-add-nuvem', title: 'Pesquisar e importar metadados de livros' }
    });
    renderIcon(btnAddNuvem, 'book-plus', { size: 12, cls: 'btn-icon-pad' });
    btnAddNuvem.createEl('span', { text: 'BUSCAR NA NUVEM' });
    btnAddNuvem.onclick = () => modais.abrirModalBuscaNuvem();

    // =========================================================================
    // MODO DASHBOARD (KOReader Analytics Completo)
    // =========================================================================
    if (modoVisualizacao === 'dashboard') {
      const dadosDashboard = GamificacaoLeituras.gerarDadosDashboard(listaLivros, notasDiarias, materiasEstudo, {
        dataHoje: todayStr,
        metaDiaria: metaDiariaPaginas,
        metaSemanalHoras: 5
      });

      BookshelfView.renderDashboardKOReader(root, dadosDashboard, {
        ...ctx,
        onSelectLivro: (livro) => {
          if (livro && livro.file) {
            livroSelecionadoPath = livro.file.path;
            modoVisualizacao = 'estante';
            renderBookshelf();
          }
        },
        onVoltarEstante: () => {
          modoVisualizacao = 'estante';
          renderBookshelf();
        }
      });
      return;
    }

    // =========================================================================
    // MODO ESTANTE (Reading Studio Dual Workspace)
    // =========================================================================

    // 2. Bloco de Histórico & Constância de 30 Dias (Heatmap Padrão Home)
    if (BookshelfView.renderHistoricoConstancia) {
      BookshelfView.renderHistoricoConstancia(root, historico30Dias, estagioLeitor, ctx);
    }

    // 3. Painel Retrátil de Desafios & Recomendações dos Estudos
    if (BookshelfView.renderDesafiosPainel) {
      BookshelfView.renderDesafiosPainel(root, listaLivros, materiasEstudo, ctx);
    }

    // 4. Dual Workspace (Split View: Estante 55% + Reader Companion 45%)
    const workspaceGrid = root.createEl('div', {
      cls: 'snoopy-bookshelf-workspace',
      attr: { style: 'display: grid; grid-template-columns: 1.15fr 1fr; gap: 20px; align-items: start;' }
    });

    // --- COLUNA ESQUERDA: A ESTANTE & CONTROLES ---
    const leftCol = workspaceGrid.createEl('div', {
      attr: { style: 'display: flex; flex-direction: column; gap: 14px;' }
    });

    const controlsBox = leftCol.createEl('div', {
      attr: { style: 'display: flex; flex-direction: column; gap: 10px;' }
    });

    // Abas de Status com contagem dinâmica
    const navTabsRow = controlsBox.createEl('div', {
      cls: 'snoopy-toolbar',
      attr: { style: 'border-bottom: 1px solid var(--snoopy-border); padding-bottom: 8px; overflow-x: auto;' }
    });

    const contagemStatus = {
      todos: listaLivros.length,
      lendo: listaLivros.filter(l => String(l.status).toLowerCase().includes('lendo')).length,
      quero_ler: listaLivros.filter(l => String(l.status).toLowerCase().includes('quero')).length,
      sintetizando: listaLivros.filter(l => String(l.status).toLowerCase().includes('sintetiz')).length,
      lidos: listaLivros.filter(l => String(l.status).toLowerCase().includes('lido')).length
    };

    const abasConfig = [
      { id: 'todos', label: `Todos (${contagemStatus.todos})` },
      { id: 'lendo', label: `Lendo (${contagemStatus.lendo})` },
      { id: 'quero_ler', label: `Quero Ler (${contagemStatus.quero_ler})` },
      { id: 'sintetizando', label: `Sintetizando (${contagemStatus.sintetizando})` },
      { id: 'lidos', label: `Lidos (${contagemStatus.lidos})` }
    ];

    abasConfig.forEach(aba => {
      const isAtiva = abaAtiva === aba.id;
      const btnAba = navTabsRow.createEl('button', {
        cls: `snoopy-btn-mode snoopy-btn-sm ${isAtiva ? 'active' : ''}`,
        text: aba.label
      });
      btnAba.onclick = () => {
        abaAtiva = aba.id;
        renderBookshelf();
      };
    });

    // Campo de Busca Instantânea + Dropdown de Gênero
    const searchRow = controlsBox.createEl('div', {
      attr: { style: 'display: flex; gap: 8px;' }
    });

    const searchInput = searchRow.createEl('input', {
      cls: 'snoopy-form-input',
      attr: {
        type: 'text',
        placeholder: 'Filtrar por título, autor, série...',
        value: termoBusca,
        style: 'flex: 1; font-size: 12px; padding: 6px 10px;'
      }
    });

    searchInput.oninput = (e) => {
      termoBusca = e.target.value.toLowerCase().trim();
      renderShelfOnly();
    };

    const todosGenerosSet = new Set();
    listaLivros.forEach(l => {
      if (Array.isArray(l.categories) && l.categories.length > 0) {
        l.categories.forEach(c => { if (c) todosGenerosSet.add(c.trim()); });
      } else if (l.category) {
        todosGenerosSet.add(l.category.trim());
      }
    });
    const generosDisponiveis = ['Todos', ...Array.from(todosGenerosSet).filter(Boolean).sort()];

    const selectGenero = searchRow.createEl('select', {
      cls: 'snoopy-form-select',
      attr: { style: 'width: 140px; font-size: 11px; padding: 5px 8px;' }
    });

    generosDisponiveis.forEach(gen => {
      const opt = selectGenero.createEl('option', {
        text: gen === 'Todos' ? 'Gênero: Todos' : gen,
        value: gen
      });
      if (generoFiltroAtivo === gen) opt.selected = true;
    });

    selectGenero.onchange = (e) => {
      generoFiltroAtivo = e.target.value;
      renderShelfOnly();
    };

    const shelfContainer = leftCol.createEl('div');
    const livroDestaque = listaLivros.find(l => l.file.path === livroSelecionadoPath) || listaLivros[0];

    function obterLivrosFiltrados() {
      let resultado = listaLivros;

      if (abaAtiva === 'lendo') {
        resultado = resultado.filter(l => String(l.status).toLowerCase().includes('lendo'));
      } else if (abaAtiva === 'quero_ler') {
        resultado = resultado.filter(l => String(l.status).toLowerCase().includes('quero'));
      } else if (abaAtiva === 'sintetizando') {
        resultado = resultado.filter(l => String(l.status).toLowerCase().includes('sintetiz'));
      } else if (abaAtiva === 'lidos') {
        resultado = resultado.filter(l => String(l.status).toLowerCase().includes('lido'));
      }

      if (generoFiltroAtivo && generoFiltroAtivo !== 'Todos') {
        const genAlvo = generoFiltroAtivo.toLowerCase();
        resultado = resultado.filter(l => {
          if (Array.isArray(l.categories) && l.categories.length > 0) {
            return l.categories.some(c => String(c).trim().toLowerCase() === genAlvo);
          }
          return String(l.category || 'Geral').trim().toLowerCase() === genAlvo;
        });
      }

      if (termoBusca) {
        resultado = resultado.filter(l => {
          const t = String(l.title || (l.file ? l.file.name : '')).toLowerCase();
          const a = String(l.author || '').toLowerCase();
          const c = String(l.category || '').toLowerCase();
          const cats = Array.isArray(l.categories) ? l.categories.join(' ').toLowerCase() : '';
          const s = String(l.series || '').toLowerCase();
          return t.includes(termoBusca) || a.includes(termoBusca) || c.includes(termoBusca) || cats.includes(termoBusca) || s.includes(termoBusca);
        });
      }

      return resultado;
    }

    function renderShelfOnly() {
      shelfContainer.innerHTML = '';
      const filtrados = obterLivrosFiltrados();
      BookshelfView.renderShelfGrid(shelfContainer, filtrados, livroDestaque, ctx);
    }

    renderShelfOnly();

    // --- COLUNA DIREITA: READER'S STUDIO COMPANION ---
    const rightCol = workspaceGrid.createEl('div', {
      attr: { style: 'position: sticky; top: 10px;' }
    });

    await BookshelfView.renderReaderCompanion(rightCol, livroDestaque, {
      ...ctx,
      materiasEstudo,
      notasDiarias
    });
  }

  await renderBookshelf();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderLeituras };
}

if (typeof dv !== 'undefined' && typeof app !== 'undefined') {
  (async () => {
    await renderLeituras(dv, app);
  })();
}

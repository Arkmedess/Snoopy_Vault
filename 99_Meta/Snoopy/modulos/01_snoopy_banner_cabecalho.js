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

    // 1. HERO COMMAND & SEARCH BAR (Fundo Tematizado com o Banner)
    const bannerBox = root.createEl('div', { cls: 'snoopy-banner-box' });
    const bannerImg = bannerBox.createEl('img', {
      attr: { loading: 'lazy', decoding: 'async' }
    });
    const customBannerPath = (ctx.config && ctx.config.banner_imagem) ? ctx.config.banner_imagem : "99_Meta/Attachments/snoopy_panoramic.jpg";
    let panoramicRes = null;
    try {
      panoramicRes = app.vault.adapter.getResourcePath(customBannerPath);
    } catch(e) {}
    const fallbackRes = app.vault.adapter.getResourcePath ? app.vault.adapter.getResourcePath("99_Meta/Attachments/snoopy_reading_banner.png") : "";
    const bannerSrc = panoramicRes || fallbackRes || "";
    bannerImg.src = bannerSrc;
    bannerImg.alt = "Snoopy Lendo Panorâmico";

    if (bannerSrc) {
      bannerBox.style.backgroundImage = `linear-gradient(rgba(7, 7, 9, 0.72), rgba(7, 7, 9, 0.90)), url("${bannerSrc}")`;
    }

    // Componente de Barra de Pesquisa e Comandos
    const omniContainer = bannerBox.createEl('div', { cls: 'snoopy-omni-container' });
    const inputWrapper = omniContainer.createEl('div', { cls: 'snoopy-omni-input-wrapper' });

    const iconBox = inputWrapper.createEl('span', { cls: 'snoopy-omni-icon' });
    if (ctx.renderIcon) ctx.renderIcon(iconBox, 'search', { size: 16 });

    const input = inputWrapper.createEl('input', {
      cls: 'snoopy-omni-input',
      attr: {
        type: 'text',
        placeholder: "Buscar notas ou digite '>' para comandos (ex: > adicionar nota tarefa)...",
        autocomplete: 'off',
        spellcheck: 'false'
      }
    });

    const clearBtn = inputWrapper.createEl('button', {
      cls: 'snoopy-omni-clear-btn',
      text: '✕'
    });

    const previewBox = omniContainer.createEl('div', { cls: 'snoopy-omni-preview-box' });

    // Intérprete de Comandos e Busca
    let comandoAtivo = null;
    let notaAtiva = null;

    function fecharPreview() {
      previewBox.style.display = 'none';
      previewBox.innerHTML = '';
      comandoAtivo = null;
      notaAtiva = null;
    }

    async function executarAcaoAtual() {
      if (comandoAtivo && typeof comandoAtivo.executar === 'function') {
        await comandoAtivo.executar();
        input.value = '';
        clearBtn.style.display = 'none';
        fecharPreview();
      } else if (notaAtiva && notaAtiva.path) {
        await app.workspace.openLinkText(notaAtiva.path, "", false);
        input.value = '';
        clearBtn.style.display = 'none';
        fecharPreview();
      }
    }

    input.addEventListener('input', () => {
      const valor = input.value.trimStart();
      clearBtn.style.display = valor.length > 0 ? 'inline-flex' : 'none';

      if (!valor) {
        fecharPreview();
        return;
      }

      previewBox.innerHTML = '';

      // MODO 1: COMANDOS PREFIXADOS POR '>'
      if (valor.startsWith('>')) {
        const cmdRaw = valor.slice(1).trim();

        // 1.1 Comando de Tarefa: "> adicionar nota tarefa <texto>" ou "> tarefa <texto>"
        const matchTarefa = cmdRaw.match(/^(adicionar\s+nota\s+tarefa|adicionar\s+tarefa|tarefa|add\s+tarefa)\s*(.*)$/i);
        if (matchTarefa) {
          const textoTarefa = matchTarefa[2].trim();
          comandoAtivo = {
            executar: async () => {
              if (!textoTarefa) return;
              try {
                const dailyFile = await garantirNotaDiaria();
                if (ctx.VaultStore && typeof ctx.VaultStore.adicionarLinhaNaSecao === 'function') {
                  await ctx.VaultStore.adicionarLinhaNaSecao(app, dailyFile.path, 'Tarefas', `- [ ] ${textoTarefa}`);
                } else {
                  const raw = await app.vault.read(dailyFile);
                  await app.vault.modify(dailyFile, `${raw}\n- [ ] ${textoTarefa}`);
                }
                if (typeof Notice !== 'undefined') new Notice(`[Snoopy] Tarefa adicionada: "${textoTarefa}"`);
                if (ctx.events) ctx.events.emit('tarefas:atualizar');
              } catch (err) {
                if (typeof Notice !== 'undefined') new Notice(`Erro ao criar tarefa: ${err.message}`);
              }
            }
          };

          const itemEl = previewBox.createEl('div', { cls: 'snoopy-omni-item active' });
          itemEl.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="snoopy-chip snoopy-chip-green">[Nova Tarefa]</span>
              <span style="font-size: 13px; color: #ffffff;">${textoTarefa ? `Adicionar tarefa: <strong>"${textoTarefa}"</strong> no Diário de Hoje` : 'Digite o que precisa ser feito...'}</span>
            </div>
            <span class="snoopy-micro" style="color: #86efac; font-weight: 700;">Enter ↵</span>
          `;
          itemEl.onclick = executarAcaoAtual;
          previewBox.style.display = 'flex';
          return;
        }

        // 1.2 Comando de Nota Rápida: "> nota <título>" ou "> adicionar nota <título>"
        const matchNota = cmdRaw.match(/^(adicionar\s+nota|nova\s+nota|nota)\s*(.*)$/i);
        if (matchNota) {
          const tituloNota = matchNota[2].trim();
          comandoAtivo = {
            executar: async () => {
              if (!tituloNota) return;
              await criarNotaInstantanea('01_Inbox', '99_Meta/Templates/Template - Inbox.md', tituloNota);
            }
          };

          const itemEl = previewBox.createEl('div', { cls: 'snoopy-omni-item active' });
          itemEl.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="snoopy-chip snoopy-chip-blue">[Nova Nota]</span>
              <span style="font-size: 13px; color: #ffffff;">${tituloNota ? `Criar nota: <strong>"${tituloNota}"</strong> em 01_Inbox` : 'Digite o título da nota...'}</span>
            </div>
            <span class="snoopy-micro" style="color: #93c5fd; font-weight: 700;">Enter ↵</span>
          `;
          itemEl.onclick = executarAcaoAtual;
          previewBox.style.display = 'flex';
          return;
        }

        // 1.3 Comando de Projeto: "> projeto <nome>"
        const matchProjeto = cmdRaw.match(/^(adicionar\s+projeto|novo\s+projeto|projeto)\s*(.*)$/i);
        if (matchProjeto) {
          const nomeProjeto = matchProjeto[2].trim();
          comandoAtivo = {
            executar: async () => {
              if (!nomeProjeto) return;
              await criarNotaInstantanea('02_Projetos', '99_Meta/Templates/Template - Projeto.md', nomeProjeto);
            }
          };

          const itemEl = previewBox.createEl('div', { cls: 'snoopy-omni-item active' });
          itemEl.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="snoopy-chip snoopy-chip-purple">[Novo Projeto]</span>
              <span style="font-size: 13px; color: #ffffff;">${nomeProjeto ? `Criar projeto: <strong>"${nomeProjeto}"</strong> em 02_Projetos` : 'Digite o nome do projeto...'}</span>
            </div>
            <span class="snoopy-micro" style="color: #d8b4fe; font-weight: 700;">Enter ↵</span>
          `;
          itemEl.onclick = executarAcaoAtual;
          previewBox.style.display = 'flex';
          return;
        }

        // 1.4 Comando de Foco Pomodoro: "> foco <tarefa>"
        const matchFoco = cmdRaw.match(/^(foco|pomodoro)\s*(.*)$/i);
        if (matchFoco) {
          const alvoFoco = matchFoco[2].trim();
          comandoAtivo = {
            executar: async () => {
              if (!alvoFoco) return;
              if (ctx.events) ctx.events.emit('pomodoro:focar', { tarefa: alvoFoco });
              if (typeof Notice !== 'undefined') new Notice(`[Snoopy] Alvo de Foco: "${alvoFoco}"`);
            }
          };

          const itemEl = previewBox.createEl('div', { cls: 'snoopy-omni-item active' });
          itemEl.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="snoopy-chip snoopy-chip-orange">[Foco Pomodoro]</span>
              <span style="font-size: 13px; color: #ffffff;">${alvoFoco ? `Definir foco: <strong>"${alvoFoco}"</strong>` : 'Digite o foco da sessão...'}</span>
            </div>
            <span class="snoopy-micro" style="color: #fdba74; font-weight: 700;">Enter ↵</span>
          `;
          itemEl.onclick = executarAcaoAtual;
          previewBox.style.display = 'flex';
          return;
        }

        // 1.5 Menu de Ajuda de Comandos (quando digita apenas '>' ou '> ajuda')
        const opcoes = [
          { cmd: '> adicionar nota tarefa ', desc: 'Adicionar tarefa na nota de hoje', badge: 'snoopy-chip-green' },
          { cmd: '> nota ', desc: 'Criar nova nota no Inbox', badge: 'snoopy-chip-blue' },
          { cmd: '> projeto ', desc: 'Criar novo projeto', badge: 'snoopy-chip-purple' },
          { cmd: '> foco ', desc: 'Definir alvo do Pomodoro', badge: 'snoopy-chip-orange' }
        ];

        opcoes.forEach(op => {
          const itemEl = previewBox.createEl('div', { cls: 'snoopy-omni-item' });
          itemEl.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="snoopy-chip ${op.badge}">${op.cmd.trim()}</span>
              <span class="snoopy-meta" style="color: #d4d4d8;">${op.desc}</span>
            </div>
            <span class="snoopy-micro" style="color: var(--snoopy-muted);">Clique para usar</span>
          `;
          itemEl.onclick = () => {
            input.value = op.cmd;
            input.focus();
            input.dispatchEvent(new Event('input'));
          };
        });
        previewBox.style.display = 'flex';
        return;
      }

      // MODO 2: BUSCA DE NOTAS NO COFRE (quando não começa com '>')
      const termo = valor.toLowerCase();
      const todosArquivos = app.vault.getMarkdownFiles ? app.vault.getMarkdownFiles() : [];
      const resultados = todosArquivos
        .filter(f => !f.path.includes('Template') && (f.basename.toLowerCase().includes(termo) || f.path.toLowerCase().includes(termo)))
        .slice(0, 5);

      if (resultados.length > 0) {
        notaAtiva = resultados[0];
        resultados.forEach((res, idx) => {
          const itemEl = previewBox.createEl('div', { cls: `snoopy-omni-item ${idx === 0 ? 'active' : ''}` });
          itemEl.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 2px; overflow: hidden;">
              <span style="font-size: 13.5px; font-weight: 600; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${res.basename}</span>
              <span class="snoopy-meta" style="font-size: 10.5px;">${res.path}</span>
            </div>
            <span class="snoopy-micro" style="color: var(--interactive-accent, #60a5fa);">${idx === 0 ? 'Enter ↵' : 'Abrir ↗'}</span>
          `;
          itemEl.onclick = async () => {
            await app.workspace.openLinkText(res.path, "", false);
            input.value = '';
            clearBtn.style.display = 'none';
            fecharPreview();
          };
        });
        previewBox.style.display = 'flex';
      } else {
        fecharPreview();
      }
    });

    clearBtn.addEventListener('click', () => {
      input.value = '';
      clearBtn.style.display = 'none';
      fecharPreview();
      input.focus();
    });

    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        await executarAcaoAtual();
      } else if (e.key === 'Escape') {
        fecharPreview();
        input.blur();
      }
    });

    // Fecha o preview ao clicar fora
    if (typeof document !== 'undefined') {
      document.addEventListener('click', (ev) => {
        if (!omniContainer.contains(ev.target)) {
          fecharPreview();
        }
      });
    }

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

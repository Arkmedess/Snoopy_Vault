/**
 * Snoopy Vault - Módulo 01: Banner e Cabeçalho de Ações Rápidas & Hero Command Bar (CLI)
 * Renderiza o banner panorâmico com enquadramento proporcional sem cortes,
 * a Hero Command Bar com suporte a comandos no padrão CLI POSIX e atalhos rápidos de 1-clique.
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
   * @returns {Promise<void>}
   */
  async render(ctx) {
    const { root, app, now, formattedDate, garantirNotaDiaria, criarNotaInstantanea } = ctx;
    const pad = (n) => String(n).padStart(2, '0');
    const dataNumericaBR = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;

    // 1. HERO COMMAND & SEARCH BAR (Fundo Tematizado com o Banner Panorâmico)
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
      const bannerScrim = `linear-gradient(180deg, rgba(8, 8, 12, 0.00) 0%, rgba(8, 8, 12, 0.04) 28%, rgba(8, 8, 12, 0.18) 46%, rgba(8, 8, 12, 0.45) 62%, rgba(8, 8, 12, 0.76) 78%, rgba(8, 8, 12, 0.92) 90%, rgba(8, 8, 12, 0.98) 100%)`;
      bannerBox.style.backgroundImage = `${bannerScrim}, url("${bannerSrc}")`;
    }

    // Contêiner da Barra de Pesquisa e Comandos
    const omniContainer = bannerBox.createEl('div', { cls: 'snoopy-omni-container' });
    const inputWrapper = omniContainer.createEl('div', { cls: 'snoopy-omni-input-wrapper' });

    const iconBox = inputWrapper.createEl('span', { cls: 'snoopy-omni-icon' });
    iconBox.innerHTML = '<span class="snoopy-cli-prompt" style="font-family: var(--font-monospace, monospace); font-weight: 700; font-size: 13px; color: rgba(255, 255, 255, 0.45);">❯</span>';

    const input = inputWrapper.createEl('input', {
      cls: 'snoopy-omni-input',
      attr: {
        type: 'text',
        placeholder: "Buscar notas ou digite '>' para comandos CLI (ex: > tarefa add, > pomodoro, > hoje)...",
        autocomplete: 'off',
        spellcheck: 'false'
      }
    });

    const submitBtn = inputWrapper.createEl('button', {
      cls: 'snoopy-omni-submit-btn',
      text: '↵',
      attr: { style: 'display: none;', title: 'Confirmar e executar comando (Enter)' }
    });

    const clearBtn = inputWrapper.createEl('button', {
      cls: 'snoopy-omni-clear-btn',
      text: '✕',
      attr: { title: 'Limpar barra' }
    });

    const previewBox = omniContainer.createEl('div', { cls: 'snoopy-omni-preview-box' });

    // Intérprete de Comandos CLI e Busca de Notas
    let comandoAtivo = null;
    let notaAtiva = null;

    function fecharPreview() {
      previewBox.style.display = 'none';
      previewBox.innerHTML = '';
      comandoAtivo = null;
      notaAtiva = null;
    }

    /**
     * Extrai flags no estilo CLI POSIX (--flag valor, -f valor, booleanas).
     *
     * @param {string} str - Texto do comando com possíveis flags.
     * @param {Date} [baseDate=now] - Data de referência para resolução de datas relativas.
     * @returns {{ textoLimpo: string, flags: object }}
     */
    function extrairFlagsCLI(str, baseDate = now) {
      const flags = {};
      let texto = str;

      // --prio ou -p
      const matchPrio = texto.match(/(?:--prio|-p)\s+([a-zA-ZáéíóúÁÉÍÓÚ]+)/i);
      if (matchPrio) {
        const rawPrio = matchPrio[1].toLowerCase();
        let normPrio = rawPrio;
        if (['alta', 'high'].includes(rawPrio)) normPrio = 'alta';
        else if (['media', 'média', 'med', 'medium'].includes(rawPrio)) normPrio = 'media';
        else if (['baixa', 'low'].includes(rawPrio)) normPrio = 'baixa';
        else if (['urgente', 'urgent'].includes(rawPrio)) normPrio = 'urgente';
        flags.prio = normPrio;
        texto = texto.replace(matchPrio[0], '');
      }

      // --data ou -d
      const matchData = texto.match(/(?:--data|-d)\s+([^\s]+)/i);
      if (matchData) {
        const valData = matchData[1].toLowerCase();
        const pad = (n) => String(n).padStart(2, '0');
        const refDate = (baseDate instanceof Date && !isNaN(baseDate)) ? baseDate : new Date();
        if (['hoje', 'today'].includes(valData)) {
          flags.data = `${refDate.getFullYear()}-${pad(refDate.getMonth() + 1)}-${pad(refDate.getDate())}`;
        } else if (['amanha', 'amanhã', 'tomorrow'].includes(valData)) {
          const amanha = new Date(refDate);
          amanha.setDate(amanha.getDate() + 1);
          flags.data = `${amanha.getFullYear()}-${pad(amanha.getMonth() + 1)}-${pad(amanha.getDate())}`;
        } else {
          flags.data = matchData[1];
        }
        texto = texto.replace(matchData[0], '');
      }

      // --kanban ou -k
      if (/(?:--kanban|-k)\b/i.test(texto)) {
        flags.kanban = true;
        texto = texto.replace(/(?:--kanban|-k)\b/i, '');
      }

      // --pasta ou -f
      const matchPasta = texto.match(/(?:--pasta|-f)\s+([^\s]+)/i);
      if (matchPasta) {
        flags.pasta = matchPasta[1];
        texto = texto.replace(matchPasta[0], '');
      }

      let textoLimpo = texto.replace(/\s+/g, ' ').trim();
      textoLimpo = textoLimpo.replace(/^["'`]|["'`]$/g, '').trim();

      return {
        textoLimpo,
        flags
      };
    }

    /**
     * Executa a ação interpretando a string fornecida (garantia absoluta de execução sob demanda).
     *
     * @param {string} rawInput
     */
    async function executarAcao(rawInput) {
      const valor = (rawInput !== undefined ? rawInput : input.value).trim();
      if (!valor) return;

      // 1. MODO COMANDO CLI (Prefixado com '>')
      if (valor.startsWith('>')) {
        const cmdRaw = valor.slice(1).trim();

        // 1.1 TAREFAS
        if (/^(tarefa|tarefas|task|tasks|t|adicionar\s+tarefa|adicionar\s+nota\s+tarefa|add\s+tarefa)\b/i.test(cmdRaw)) {
          const restoCmd = cmdRaw.replace(/^(tarefa|tarefas|task|tasks|t|adicionar\s+tarefa|adicionar\s+nota\s+tarefa|add\s+tarefa)\s*/i, '').trim();

          // Subcomando: done / concluir / check
          if (/^(done|concluir|check)\b/i.test(restoCmd)) {
            const termoBusca = restoCmd.replace(/^(done|concluir|check)\s*/i, '').trim();
            if (!termoBusca) return;
            try {
              const dailyFile = await garantirNotaDiaria();
              const raw = await app.vault.read(dailyFile);
              const regex = new RegExp(`- \\[ \\] (.*${termoBusca}.*)`, 'i');
              if (regex.test(raw)) {
                const pad = (n) => String(n).padStart(2, '0');
                const hojeISO = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
                const novoRaw = raw.replace(regex, `- [x] $1 ✅ ${hojeISO}`);
                await app.vault.modify(dailyFile, novoRaw);
                if (typeof Notice !== 'undefined') new Notice(`[Snoopy] Tarefa concluída: "${termoBusca}"`);
                if (ctx.events) ctx.events.emit('tarefas:atualizar');
              } else {
                if (typeof Notice !== 'undefined') new Notice(`[Snoopy] Tarefa não encontrada: "${termoBusca}"`);
              }
            } catch (err) {
              if (typeof Notice !== 'undefined') new Notice(`Erro: ${err.message}`);
            }
            limparEFechar();
            return;
          }

          // Subcomando: list / ls / hoje
          if (/^(list|ls|hoje|diario)\b/i.test(restoCmd)) {
            const dailyFile = await garantirNotaDiaria();
            await app.workspace.openLinkText(dailyFile.path, "", false);
            if (typeof Notice !== 'undefined') new Notice('[Snoopy] Tarefas de hoje abertas');
            limparEFechar();
            return;
          }

          // Subcomando: add / adicionar ou texto direto
          const textoArg = restoCmd.replace(/^add\s+/i, '').trim();
          const { textoLimpo, flags } = extrairFlagsCLI(textoArg, now);
          if (!textoLimpo) return;

          try {
            let tagsExtras = '';
            if (flags.prio) tagsExtras += ` #prio/${flags.prio}`;
            if (flags.data) tagsExtras += ` 📅 ${flags.data}`;
            if (flags.kanban) tagsExtras += ' #kanban';

            const linhaFinal = `- [ ] ${textoLimpo}${tagsExtras}`;
            const dailyFile = await garantirNotaDiaria();

            if (ctx.VaultStore && typeof ctx.VaultStore.adicionarLinhaNaSecao === 'function') {
              await ctx.VaultStore.adicionarLinhaNaSecao(app, dailyFile.path, 'Tarefas', linhaFinal);
            } else {
              const raw = await app.vault.read(dailyFile);
              await app.vault.modify(dailyFile, `${raw}\n${linhaFinal}`);
            }

            if (typeof Notice !== 'undefined') new Notice(`[Snoopy] Tarefa adicionada: "${textoLimpo}"`);
            if (ctx.events) ctx.events.emit('tarefas:atualizar');
          } catch (err) {
            if (typeof Notice !== 'undefined') new Notice(`Erro ao criar tarefa: ${err.message}`);
          }
          limparEFechar();
          return;
        }

        // 1.2 DIÁRIO / HOJE
        if (/^(hoje|daily|diario|dia)\b/i.test(cmdRaw)) {
          const dailyFile = await garantirNotaDiaria();
          await app.workspace.openLinkText(dailyFile.path, "", false);
          if (typeof Notice !== 'undefined') new Notice('[Snoopy] Diário de hoje aberto');
          limparEFechar();
          return;
        }

        // 1.3 LEITURAS / LIVROS
        if (/^(leitura|leituras|livro|livros|book|books)\b/i.test(cmdRaw)) {
          const restoCmd = cmdRaw.replace(/^(leitura|leituras|livro|livros|book|books)\s*/i, '').replace(/^add\s+/i, '').trim();
          const { textoLimpo } = extrairFlagsCLI(restoCmd, now);
          if (textoLimpo) {
            await criarNotaInstantanea('04_Leituras/Livros', '99_Meta/Templates/Template - Livro.md', textoLimpo);
          }
          limparEFechar();
          return;
        }

        // 1.4 NOTA RÁPIDA
        if (/^(nota|notas|note|n|adicionar\s+nota|nova\s+nota)\b/i.test(cmdRaw)) {
          const restoCmd = cmdRaw.replace(/^(nota|notas|note|n|adicionar\s+nota|nova\s+nota)\s*/i, '').replace(/^add\s+/i, '').trim();
          const { textoLimpo, flags } = extrairFlagsCLI(restoCmd, now);
          const pastaDestino = flags.pasta || '01_Inbox';
          if (textoLimpo) {
            await criarNotaInstantanea(pastaDestino, '99_Meta/Templates/Template - Inbox.md', textoLimpo);
          }
          limparEFechar();
          return;
        }

        // 1.5 PROJETO
        if (/^(projeto|projetos|project|proj)\b/i.test(cmdRaw)) {
          const nomeProjeto = cmdRaw.replace(/^(projeto|projetos|project|proj)\s*/i, '').replace(/^add\s+/i, '').trim();
          const { textoLimpo } = extrairFlagsCLI(nomeProjeto, now);
          if (textoLimpo) {
            await criarNotaInstantanea('02_Projetos', '99_Meta/Templates/Template - Projeto.md', textoLimpo);
          }
          limparEFechar();
          return;
        }

        // 1.6 ESTUDO
        if (/^(estudo|estudos|materia|adicionar\s+estudo)\b/i.test(cmdRaw)) {
          const nomeEstudo = cmdRaw.replace(/^(estudo|estudos|materia|adicionar\s+estudo)\s*/i, '').replace(/^add\s+/i, '').trim();
          const { textoLimpo } = extrairFlagsCLI(nomeEstudo, now);
          if (textoLimpo) {
            await criarNotaInstantanea('03_Estudos', '99_Meta/Templates/Template - Estudo.md', textoLimpo);
          }
          limparEFechar();
          return;
        }

        // 1.7 POMODORO COMANDOS (start, play, pause, stop, reset, next, proximo, skip)
        if (/^(?:pomodoro|pomo)\s+(start|play|pause|stop|reset|next|proximo|skip)\b/i.test(cmdRaw)) {
          let acao = cmdRaw.match(/^(?:pomodoro|pomo)\s+([a-zA-Z]+)/i)[1].toLowerCase();
          if (['play'].includes(acao)) acao = 'start';
          if (['stop'].includes(acao)) acao = 'reset';
          if (['next', 'skip'].includes(acao)) acao = 'proximo';

          if (ctx.events) ctx.events.emit('pomodoro:comando', { acao });
          if (typeof Notice !== 'undefined') new Notice(`[Snoopy] Pomodoro: ${acao.toUpperCase()}`);
          limparEFechar();
          return;
        }

        // 1.8 FOCO / FILA
        const matchFoco = cmdRaw.match(/^(?:foco|pomodoro\s+foco|pomo\s+foco)\s*(.*)$/i);
        const matchFila = cmdRaw.match(/^(?:fila|pomodoro\s+fila|pomo\s+fila)\s*(?:add\s+)?(.*)$/i);
        if (matchFoco || matchFila) {
          const isFila = Boolean(matchFila);
          const alvo = (isFila ? matchFila[1] : matchFoco[1]).trim();
          if (alvo) {
            if (isFila) {
              if (ctx.events) ctx.events.emit('pomodoro:enfileirar', { titulo: alvo, pomosTotal: 1 });
              if (typeof Notice !== 'undefined') new Notice(`[Snoopy] Enfileirado na playlist: "${alvo}"`);
            } else {
              if (ctx.events) ctx.events.emit('pomodoro:foco', { texto: alvo });
              if (typeof Notice !== 'undefined') new Notice(`[Snoopy] Alvo de Foco: "${alvo}"`);
            }
          }
          limparEFechar();
          return;
        }

        // 1.9 KANBAN
        if (/^(kanban|k)\b/i.test(cmdRaw)) {
          const kanbanEl = document.querySelector('.snoopy-kanban-hub') || document.querySelector('.snoopy-kanban-board');
          if (kanbanEl) {
            kanbanEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          if (typeof Notice !== 'undefined') new Notice('[Snoopy] Quadro Kanban visualizado');
          limparEFechar();
          return;
        }

        // 1.10 CONFIGURAÇÕES
        if (/^(config|configuracoes|configurações|settings)\b/i.test(cmdRaw)) {
          await app.workspace.openLinkText("99_Meta/⚙️ Configurações.md", "", false);
          if (typeof Notice !== 'undefined') new Notice('[Snoopy] Configurações abertas');
          limparEFechar();
          return;
        }

        // 1.11 AJUDA / HELP
        if (/^(help|ajuda|\?)\b/i.test(cmdRaw)) {
          if (typeof Notice !== 'undefined') new Notice('[Snoopy CLI] Digite > para ver os comandos rápidos do terminal');
          limparEFechar();
          return;
        }

        // 1.12 CLEAR / CLS
        if (/^(clear|cls)\b/i.test(cmdRaw)) {
          limparEFechar();
          return;
        }
      }

      // 2. MODO BUSCA DE NOTA NO VAULT
      if (notaAtiva && notaAtiva.path) {
        await app.workspace.openLinkText(notaAtiva.path, "", false);
        limparEFechar();
        return;
      }

      // Fallback: se digitou nome de nota e deu Enter
      const todos = app.vault.getMarkdownFiles ? app.vault.getMarkdownFiles() : [];
      const encontrada = todos.find(f => f.basename.toLowerCase().includes(valor.toLowerCase()));
      if (encontrada) {
        await app.workspace.openLinkText(encontrada.path, "", false);
        limparEFechar();
      }
    }

    function limparEFechar() {
      input.value = '';
      clearBtn.style.display = 'none';
      submitBtn.style.display = 'none';
      iconBox.classList.remove('is-cli');
      fecharPreview();
    }

    async function executarAcaoAtual() {
      if (comandoAtivo && typeof comandoAtivo.executar === 'function') {
        await comandoAtivo.executar();
        limparEFechar();
      } else {
        await executarAcao(input.value);
      }
    }

    input.addEventListener('input', () => {
      const valor = input.value.trimStart();
      clearBtn.style.display = valor.length > 0 ? 'inline-flex' : 'none';
      submitBtn.style.display = valor.length > 0 ? 'inline-flex' : 'none';

      if (!valor) {
        fecharPreview();
        return;
      }

      previewBox.innerHTML = '';

      // MODO 1: COMANDOS CLI PREFIXADOS POR '>'
      if (valor.startsWith('>')) {
        iconBox.classList.add('is-cli');
        const cmdRaw = valor.slice(1).trim();

        // 1.1 TAREFAS
        if (/^(tarefa|tarefas|task|tasks|t|adicionar\s+tarefa|adicionar\s+nota\s+tarefa|add\s+tarefa)\b/i.test(cmdRaw)) {
          const restoCmd = cmdRaw.replace(/^(tarefa|tarefas|task|tasks|t|adicionar\s+tarefa|adicionar\s+nota\s+tarefa|add\s+tarefa)\s*/i, '').trim();

          if (/^(done|concluir|check)\b/i.test(restoCmd)) {
            const termoBusca = restoCmd.replace(/^(done|concluir|check)\s*/i, '').trim();
            comandoAtivo = { executar: () => executarAcao(input.value) };

            const itemEl = previewBox.createEl('div', { cls: 'snoopy-omni-item active' });
            itemEl.innerHTML = `
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="snoopy-chip snoopy-chip-green">[Concluir Tarefa]</span>
                <span style="font-size: 13px; color: #ffffff;">${termoBusca ? `Marcar como concluída: <strong>"${termoBusca}"</strong>` : 'Digite o nome da tarefa a concluir...'}</span>
              </div>
              <span class="snoopy-micro" style="color: #86efac; font-weight: 700;">Enter ↵</span>
            `;
            itemEl.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); executarAcaoAtual(); });
            itemEl.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); executarAcaoAtual(); });
            previewBox.style.display = 'flex';
            return;
          }

          if (/^(list|ls|hoje|diario)\b/i.test(restoCmd)) {
            comandoAtivo = { executar: () => executarAcao(input.value) };

            const itemEl = previewBox.createEl('div', { cls: 'snoopy-omni-item active' });
            itemEl.innerHTML = `
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="snoopy-chip snoopy-chip-green">[Listar Tarefas]</span>
                <span style="font-size: 13px; color: #ffffff;">Abrir lista de tarefas na nota diária</span>
              </div>
              <span class="snoopy-micro" style="color: #86efac; font-weight: 700;">Enter ↵</span>
            `;
            itemEl.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); executarAcaoAtual(); });
            itemEl.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); executarAcaoAtual(); });
            previewBox.style.display = 'flex';
            return;
          }

          const textoArg = restoCmd.replace(/^add\s+/i, '').trim();
          const { textoLimpo, flags } = extrairFlagsCLI(textoArg, now);
          comandoAtivo = { executar: () => executarAcao(input.value) };

          let flagsPills = '';
          if (flags.prio) flagsPills += `<span class="snoopy-chip snoopy-chip-orange" style="font-size: 10px;">prio: ${flags.prio}</span>`;
          if (flags.data) flagsPills += `<span class="snoopy-chip snoopy-chip-blue" style="font-size: 10px;">data: ${flags.data}</span>`;
          if (flags.kanban) flagsPills += `<span class="snoopy-chip snoopy-chip-purple" style="font-size: 10px;">kanban: sim</span>`;

          const itemEl = previewBox.createEl('div', { cls: 'snoopy-omni-item active' });
          itemEl.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="snoopy-chip snoopy-chip-green">[Nova Tarefa]</span>
                <span style="font-size: 13px; color: #ffffff;">${textoLimpo ? `Adicionar tarefa: <strong>"${textoLimpo}"</strong>` : 'Digite o que precisa ser feito...'}</span>
              </div>
              ${flagsPills ? `<div style="display: flex; gap: 6px; margin-left: 2px;">${flagsPills}</div>` : ''}
            </div>
            <span class="snoopy-micro" style="color: #86efac; font-weight: 700;">Enter ↵</span>
          `;
          itemEl.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); executarAcaoAtual(); });
          itemEl.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); executarAcaoAtual(); });
          previewBox.style.display = 'flex';
          return;
        }

        // 1.2 HOJE / DIÁRIO
        if (/^(hoje|daily|diario|dia)\b/i.test(cmdRaw)) {
          comandoAtivo = { executar: () => executarAcao(input.value) };

          const itemEl = previewBox.createEl('div', { cls: 'snoopy-omni-item active' });
          itemEl.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="snoopy-chip snoopy-chip-blue">[Nota Diária]</span>
              <span style="font-size: 13px; color: #ffffff;">Abrir nota diária de hoje (${dataNumericaBR})</span>
            </div>
            <span class="snoopy-micro" style="color: #93c5fd; font-weight: 700;">Enter ↵</span>
          `;
          itemEl.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); executarAcaoAtual(); });
          itemEl.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); executarAcaoAtual(); });
          previewBox.style.display = 'flex';
          return;
        }

        // 1.3 LEITURAS / LIVROS
        if (/^(leitura|leituras|livro|livros|book|books)\b/i.test(cmdRaw)) {
          const restoCmd = cmdRaw.replace(/^(leitura|leituras|livro|livros|book|books)\s*/i, '').replace(/^add\s+/i, '').trim();
          const { textoLimpo } = extrairFlagsCLI(restoCmd, now);
          comandoAtivo = { executar: () => executarAcao(input.value) };

          const itemEl = previewBox.createEl('div', { cls: 'snoopy-omni-item active' });
          itemEl.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="snoopy-chip snoopy-chip-purple">[Novo Livro]</span>
              <span style="font-size: 13px; color: #ffffff;">${textoLimpo ? `Registrar leitura: <strong>"${textoLimpo}"</strong> em 04_Leituras/Livros` : 'Digite o título do livro...'}</span>
            </div>
            <span class="snoopy-micro" style="color: #d8b4fe; font-weight: 700;">Enter ↵</span>
          `;
          itemEl.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); executarAcaoAtual(); });
          itemEl.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); executarAcaoAtual(); });
          previewBox.style.display = 'flex';
          return;
        }

        // 1.4 NOTAS
        if (/^(nota|notas|note|n|adicionar\s+nota|nova\s+nota)\b/i.test(cmdRaw)) {
          const restoCmd = cmdRaw.replace(/^(nota|notas|note|n|adicionar\s+nota|nova\s+nota)\s*/i, '').replace(/^add\s+/i, '').trim();
          const { textoLimpo, flags } = extrairFlagsCLI(restoCmd, now);
          const pastaDestino = flags.pasta || '01_Inbox';
          comandoAtivo = { executar: () => executarAcao(input.value) };

          const itemEl = previewBox.createEl('div', { cls: 'snoopy-omni-item active' });
          itemEl.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="snoopy-chip snoopy-chip-blue">[Nova Nota]</span>
              <span style="font-size: 13px; color: #ffffff;">${textoLimpo ? `Criar nota: <strong>"${textoLimpo}"</strong> em ${pastaDestino}` : 'Digite o título da nota...'}</span>
            </div>
            <span class="snoopy-micro" style="color: #93c5fd; font-weight: 700;">Enter ↵</span>
          `;
          itemEl.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); executarAcaoAtual(); });
          itemEl.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); executarAcaoAtual(); });
          previewBox.style.display = 'flex';
          return;
        }

        // 1.5 PROJETOS
        if (/^(projeto|projetos|project|proj)\b/i.test(cmdRaw)) {
          const nomeProjeto = cmdRaw.replace(/^(projeto|projetos|project|proj)\s*/i, '').replace(/^add\s+/i, '').trim();
          const { textoLimpo } = extrairFlagsCLI(nomeProjeto, now);
          comandoAtivo = { executar: () => executarAcao(input.value) };

          const itemEl = previewBox.createEl('div', { cls: 'snoopy-omni-item active' });
          itemEl.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="snoopy-chip snoopy-chip-purple">[Novo Projeto]</span>
              <span style="font-size: 13px; color: #ffffff;">${textoLimpo ? `Criar projeto: <strong>"${textoLimpo}"</strong> em 02_Projetos` : 'Digite o nome do projeto...'}</span>
            </div>
            <span class="snoopy-micro" style="color: #d8b4fe; font-weight: 700;">Enter ↵</span>
          `;
          itemEl.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); executarAcaoAtual(); });
          itemEl.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); executarAcaoAtual(); });
          previewBox.style.display = 'flex';
          return;
        }

        // 1.6 ESTUDOS
        if (/^(estudo|estudos|materia|adicionar\s+estudo)\b/i.test(cmdRaw)) {
          const nomeEstudo = cmdRaw.replace(/^(estudo|estudos|materia|adicionar\s+estudo)\s*/i, '').replace(/^add\s+/i, '').trim();
          const { textoLimpo } = extrairFlagsCLI(nomeEstudo, now);
          comandoAtivo = { executar: () => executarAcao(input.value) };

          const itemEl = previewBox.createEl('div', { cls: 'snoopy-omni-item active' });
          itemEl.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="snoopy-chip snoopy-chip-blue">[Novo Estudo]</span>
              <span style="font-size: 13px; color: #ffffff;">${nomeEstudo ? `Criar matéria: <strong>"${nomeEstudo}"</strong> em 03_Estudos` : 'Digite o nome da matéria...'}</span>
            </div>
            <span class="snoopy-micro" style="color: #93c5fd; font-weight: 700;">Enter ↵</span>
          `;
          itemEl.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); executarAcaoAtual(); });
          itemEl.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); executarAcaoAtual(); });
          previewBox.style.display = 'flex';
          return;
        }

        // 1.7 POMODORO COMANDOS
        if (/^(?:pomodoro|pomo)\s+(start|play|pause|stop|reset|next|proximo|skip)\b/i.test(cmdRaw)) {
          let acao = cmdRaw.match(/^(?:pomodoro|pomo)\s+([a-zA-Z]+)/i)[1].toLowerCase();
          if (['play'].includes(acao)) acao = 'start';
          if (['stop'].includes(acao)) acao = 'reset';
          if (['next', 'skip'].includes(acao)) acao = 'proximo';
          comandoAtivo = { executar: () => executarAcao(input.value) };

          const itemEl = previewBox.createEl('div', { cls: 'snoopy-omni-item active' });
          itemEl.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="snoopy-chip snoopy-chip-orange">[Pomodoro Timer]</span>
              <span style="font-size: 13px; color: #ffffff;">Executar comando do timer: <strong>${acao.toUpperCase()}</strong></span>
            </div>
            <span class="snoopy-micro" style="color: #fdba74; font-weight: 700;">Enter ↵</span>
          `;
          itemEl.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); executarAcaoAtual(); });
          itemEl.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); executarAcaoAtual(); });
          previewBox.style.display = 'flex';
          return;
        }

        // 1.8 FOCO / FILA
        const matchFoco = cmdRaw.match(/^(?:foco|pomodoro\s+foco|pomo\s+foco)\s*(.*)$/i);
        const matchFila = cmdRaw.match(/^(?:fila|pomodoro\s+fila|pomo\s+fila)\s*(?:add\s+)?(.*)$/i);
        if (matchFoco || matchFila) {
          const isFila = Boolean(matchFila);
          const alvo = (isFila ? matchFila[1] : matchFoco[1]).trim();
          comandoAtivo = { executar: () => executarAcao(input.value) };

          const itemEl = previewBox.createEl('div', { cls: 'snoopy-omni-item active' });
          itemEl.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="snoopy-chip snoopy-chip-orange">[${isFila ? 'Fila do Pomodoro' : 'Foco Direto'}]</span>
              <span style="font-size: 13px; color: #ffffff;">${alvo ? `${isFila ? 'Adicionar à playlist:' : 'Definir foco imediato:'} <strong>"${alvo}"</strong>` : 'Digite o alvo da sessão...'}</span>
            </div>
            <span class="snoopy-micro" style="color: #fdba74; font-weight: 700;">Enter ↵</span>
          `;
          itemEl.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); executarAcaoAtual(); });
          itemEl.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); executarAcaoAtual(); });
          previewBox.style.display = 'flex';
          return;
        }

        // 1.9 KANBAN
        if (/^(kanban|k)\b/i.test(cmdRaw)) {
          comandoAtivo = { executar: () => executarAcao(input.value) };

          const itemEl = previewBox.createEl('div', { cls: 'snoopy-omni-item active' });
          itemEl.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="snoopy-chip snoopy-chip-purple">[Kanban]</span>
              <span style="font-size: 13px; color: #ffffff;">Navegar até o Quadro Kanban Interativo</span>
            </div>
            <span class="snoopy-micro" style="color: #d8b4fe; font-weight: 700;">Enter ↵</span>
          `;
          itemEl.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); executarAcaoAtual(); });
          itemEl.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); executarAcaoAtual(); });
          previewBox.style.display = 'flex';
          return;
        }

        // 1.10 CONFIGURAÇÕES
        if (/^(config|configuracoes|configurações|settings)\b/i.test(cmdRaw)) {
          comandoAtivo = { executar: () => executarAcao(input.value) };

          const itemEl = previewBox.createEl('div', { cls: 'snoopy-omni-item active' });
          itemEl.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="snoopy-chip snoopy-chip-gray">[Configurações]</span>
              <span style="font-size: 13px; color: #ffffff;">Abrir configurações do Snoopy Vault</span>
            </div>
            <span class="snoopy-micro" style="color: #d4d4d8; font-weight: 700;">Enter ↵</span>
          `;
          itemEl.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); executarAcaoAtual(); });
          itemEl.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); executarAcaoAtual(); });
          previewBox.style.display = 'flex';
          return;
        }

        // 1.11 MENU DINÂMICO DE COMANDOS CLI (com filtro em tempo real)
        const opcoes = [
          { cmd: '> tarefa add Ler livro -p alta -d hoje -k', label: 'tarefa add', desc: 'Criar tarefa com flags [-p] [-d] [-k]', badge: 'snoopy-chip-green' },
          { cmd: '> tarefa done Algoritmos', label: 'tarefa done', desc: 'Concluir tarefa pelo nome', badge: 'snoopy-chip-green' },
          { cmd: '> hoje', label: 'hoje', desc: 'Abrir nota diária de hoje', badge: 'snoopy-chip-blue' },
          { cmd: '> pomodoro start', label: 'pomodoro start', desc: 'Iniciar contagem do timer', badge: 'snoopy-chip-orange' },
          { cmd: '> pomodoro pause', label: 'pomodoro pause', desc: 'Pausar o timer pomodoro', badge: 'snoopy-chip-orange' },
          { cmd: '> pomodoro stop', label: 'pomodoro stop', desc: 'Reiniciar o timer pomodoro', badge: 'snoopy-chip-orange' },
          { cmd: '> pomodoro next', label: 'pomodoro next', desc: 'Avançar para próximo ciclo', badge: 'snoopy-chip-orange' },
          { cmd: '> foco Resolver Issue #42', label: 'foco', desc: 'Definir alvo do Pomodoro', badge: 'snoopy-chip-orange' },
          { cmd: '> fila add Revisar código', label: 'fila add', desc: 'Adicionar à Playlist do Pomodoro', badge: 'snoopy-chip-orange' },
          { cmd: '> nota add Minha Ideia -f 01_Inbox', label: 'nota add', desc: 'Criar nota no Inbox ou pasta', badge: 'snoopy-chip-blue' },
          { cmd: '> leitura add Clean Architecture', label: 'leitura add', desc: 'Criar registro de livro em Leituras', badge: 'snoopy-chip-purple' },
          { cmd: '> projeto add Dashboard', label: 'projeto add', desc: 'Criar projeto com template estruturado', badge: 'snoopy-chip-purple' },
          { cmd: '> estudo add Algoritmos', label: 'estudo add', desc: 'Criar matéria em Estudos', badge: 'snoopy-chip-blue' },
          { cmd: '> kanban', label: 'kanban', desc: 'Rolar até o painel Kanban', badge: 'snoopy-chip-purple' },
          { cmd: '> config', label: 'config', desc: 'Abrir configurações do cofre', badge: 'snoopy-chip-gray' }
        ];

        const termoBusca = cmdRaw.toLowerCase();
        const opcoesFiltradas = termoBusca
          ? opcoes.filter(op => {
              const cmdSemPrefixo = op.cmd.replace(/^>\s*/, '').toLowerCase();
              return cmdSemPrefixo.startsWith(termoBusca) || op.label.toLowerCase().startsWith(termoBusca);
            })
          : opcoes;

        if (opcoesFiltradas.length > 0) {
          opcoesFiltradas.forEach(op => {
            const itemEl = previewBox.createEl('div', { cls: 'snoopy-omni-item' });
            itemEl.innerHTML = `
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="snoopy-chip ${op.badge}">${op.label}</span>
                <span class="snoopy-meta" style="color: #d4d4d8;">${op.desc}</span>
              </div>
              <span class="snoopy-micro" style="color: var(--snoopy-muted); font-family: var(--font-monospace, monospace);">${op.cmd}</span>
            `;
            itemEl.addEventListener('mousedown', (e) => {
              e.preventDefault();
              e.stopPropagation();
              input.value = op.cmd;
              input.focus();
              input.dispatchEvent(new Event('input'));
            });
            itemEl.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              input.value = op.cmd;
              input.focus();
              input.dispatchEvent(new Event('input'));
            });
          });
          previewBox.style.display = 'flex';
          return;
        } else {
          fecharPreview();
          return;
        }
      }

      // MODO 2: BUSCA DE NOTAS NO COFRE
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
          itemEl.addEventListener('mousedown', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await app.workspace.openLinkText(res.path, "", false);
            limparEFechar();
          });
          itemEl.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await app.workspace.openLinkText(res.path, "", false);
            limparEFechar();
          });
        });
        previewBox.style.display = 'flex';
      } else {
        fecharPreview();
      }
    });

    submitBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await executarAcaoAtual();
    });

    clearBtn.addEventListener('click', () => {
      limparEFechar();
      input.focus();
    });

    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' || e.keyCode === 13) {
        e.preventDefault();
        e.stopPropagation();
        await executarAcaoAtual();
      } else if (e.key === 'Tab') {
        const primeiroItem = previewBox.querySelector('.snoopy-omni-item');
        if (primeiroItem && previewBox.style.display !== 'none') {
          const microCmd = primeiroItem.querySelector('.snoopy-micro');
          if (microCmd && microCmd.innerText && microCmd.innerText.startsWith('>')) {
            e.preventDefault();
            e.stopPropagation();
            input.value = microCmd.innerText;
            input.dispatchEvent(new Event('input'));
          }
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
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

    const dateBox = headerRow.createEl('div', { cls: 'snoopy-header-datebox' });
    dateBox.createEl('div', { 
      cls: 'snoopy-date-title', 
      text: formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1) 
    });
    dateBox.createEl('div', { 
      cls: 'snoopy-meta',
      text: 'Espaço Central de Foco • Snoopy Edition'
    });

    const navPillsRow = headerRow.createEl('div', { 
      cls: 'snoopy-nav-pills',
      attr: { style: 'display: flex; align-items: center; gap: 8px; flex-wrap: wrap;' } 
    });

    // 1. Grupo de Navegação: Direcionar para Módulos
    const modulosGroup = navPillsRow.createEl('div', {
      cls: 'snoopy-nav-group-modulos',
      attr: { style: 'display: inline-flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); padding: 2px 4px; border-radius: 6px;' }
    });

    const moduloItems = [
      { label: 'HOJE', action: 'daily', icon: 'calendar', title: 'Abrir nota diária de hoje' },
      { label: 'ESTUDOS ↗', action: 'sub_estudos', icon: 'book-open', title: 'Direcionar para o Painel de Estudos' },
      { label: 'CONFIG ↗', action: 'config', icon: 'settings', title: 'Direcionar para Configurações' }
    ];

    // Divisor visual entre Navegação e Ações Rápidas
    navPillsRow.createEl('div', {
      attr: { style: 'width: 1px; height: 18px; background: rgba(255,255,255,0.12); margin: 0 1px;' }
    });

    // 2. Grupo de Ações: Adicionar Itens
    const acoesGroup = navPillsRow.createEl('div', {
      cls: 'snoopy-nav-group-acoes',
      attr: { style: 'display: inline-flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); padding: 2px 4px; border-radius: 6px;' }
    });

    const acaoItems = [
      { label: '+ TAREFA', action: 'nova_tarefa', icon: 'check-square', title: 'Adicionar nova tarefa para hoje' },
      { label: '+ NOTA', folder: '01_Inbox', tpl: '99_Meta/Templates/Template - Inbox.md', prefix: 'Nota Rápida', icon: 'inbox', title: 'Criar nota rápida no Inbox' },
      { label: '+ PROJETO', folder: '02_Projetos', tpl: '99_Meta/Templates/Template - Projeto.md', prefix: 'Novo Projeto', icon: 'folder-plus', title: 'Criar novo projeto a partir do template' },
      { label: '+ LEITURA', folder: '04_Leituras/Livros', tpl: '99_Meta/Templates/Template - Livro.md', prefix: 'Novo Livro', icon: 'book-plus', title: 'Criar novo livro de leitura' }
    ];

    const renderItemBtn = (item, parentEl) => {
      const criarBtnFn = (ctx.UIKit && typeof ctx.UIKit.criarBotao === 'function')
        ? ctx.UIKit.criarBotao.bind(ctx.UIKit)
        : null;

      const onClick = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (e && e.stopPropagation) e.stopPropagation();

        if (item.action === 'daily') {
          const dailyFile = await garantirNotaDiaria();
          await app.workspace.openLinkText(dailyFile.path, "", false);
          if (typeof Notice !== 'undefined') new Notice(`Nota de hoje aberta: ${dailyFile.basename}`);
        } else if (item.action === 'sub_estudos') {
          await app.workspace.openLinkText("03_Estudos/Painel de Estudos.md", "", false);
          if (typeof Notice !== 'undefined') new Notice('Painel de Estudos aberto');
        } else if (item.action === 'config') {
          await app.workspace.openLinkText("99_Meta/⚙️ Configurações.md", "", false);
          if (typeof Notice !== 'undefined') new Notice('Configurações do Snoopy Vault abertas');
        } else if (item.action === 'nova_tarefa') {
          if (typeof window !== 'undefined' && typeof window.__snoopyAbrirModalNovaTarefa === 'function') {
            window.__snoopyAbrirModalNovaTarefa();
          } else {
            const dailyFile = await garantirNotaDiaria();
            await app.workspace.openLinkText(dailyFile.path, "", false);
            if (typeof Notice !== 'undefined') new Notice('Abra a seção de tarefas na nota diária');
          }
        } else {
          criarNotaInstantanea(item.folder, item.tpl, item.prefix);
        }
      };

      if (criarBtnFn) {
        criarBtnFn(parentEl, {
          label: item.label,
          icon: item.icon,
          variant: 'pill',
          size: 'sm',
          onClick
        }, ctx);
      } else {
        const btn = parentEl.createEl('button', { 
          cls: 'snoopy-nav-pill-btn snoopy-btn-sm',
          attr: { title: item.title || item.label }
        });
        if (ctx.renderIcon && item.icon) {
          ctx.renderIcon(btn, item.icon, { size: 11 });
        }
        btn.createEl('span', { text: item.label });
        btn.addEventListener('click', onClick);
      }
    };

    moduloItems.forEach(item => renderItemBtn(item, modulosGroup));
    acaoItems.forEach(item => renderItemBtn(item, acoesGroup));
  }
};

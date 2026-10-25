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
      bannerBox.style.backgroundImage = `linear-gradient(180deg, rgba(7, 7, 9, 0.0) 0%, rgba(7, 7, 9, 0.20) 50%, rgba(7, 7, 9, 0.75) 100%), url("${bannerSrc}")`;
    }

    // Contêiner da Barra de Pesquisa e Comandos
    const omniContainer = bannerBox.createEl('div', { cls: 'snoopy-omni-container' });
    const inputWrapper = omniContainer.createEl('div', { cls: 'snoopy-omni-input-wrapper' });

    const iconBox = inputWrapper.createEl('span', { cls: 'snoopy-omni-icon' });
    if (ctx.renderIcon) ctx.renderIcon(iconBox, 'search', { size: 16 });

    const input = inputWrapper.createEl('input', {
      cls: 'snoopy-omni-input',
      attr: {
        type: 'text',
        placeholder: "Buscar notas ou digite '>' para comandos CLI (ex: > tarefa add Ler livro --prio alta)...",
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
     * Extrai flags no estilo CLI POSIX de uma string (--flag valor ou --flag).
     *
     * @param {string} str - Texto do comando com possíveis flags.
     * @returns {{ textoLimpo: string, flags: object }}
     */
    function extrairFlagsCLI(str) {
      const flags = {};
      let texto = str;

      const matchPrio = texto.match(/--prio\s+([a-zA-Z]+)/i);
      if (matchPrio) {
        flags.prio = matchPrio[1].toLowerCase();
        texto = texto.replace(matchPrio[0], '');
      }

      const matchData = texto.match(/--data\s+([0-9\-\/]+)/i);
      if (matchData) {
        flags.data = matchData[1];
        texto = texto.replace(matchData[0], '');
      }

      if (/--kanban\b/i.test(texto)) {
        flags.kanban = true;
        texto = texto.replace(/--kanban\b/i, '');
      }

      const matchPasta = texto.match(/--pasta\s+([^\s]+)/i);
      if (matchPasta) {
        flags.pasta = matchPasta[1];
        texto = texto.replace(matchPasta[0], '');
      }

      return {
        textoLimpo: texto.replace(/\s+/g, ' ').trim(),
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
        if (/^(tarefa|tarefas|task|adicionar\s+tarefa|adicionar\s+nota\s+tarefa|add\s+tarefa)\b/i.test(cmdRaw)) {
          const restoCmd = cmdRaw.replace(/^(tarefa|tarefas|task|adicionar\s+tarefa|adicionar\s+nota\s+tarefa|add\s+tarefa)\s*/i, '').trim();

          // Subcomando: done / concluir
          if (/^(done|concluir)\b/i.test(restoCmd)) {
            const termoBusca = restoCmd.replace(/^(done|concluir)\s*/i, '').trim();
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

          // Subcomando: add / adicionar
          const textoArg = restoCmd.replace(/^add\s+/i, '').trim();
          const { textoLimpo, flags } = extrairFlagsCLI(textoArg);
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

        // 1.2 NOTA RÁPIDA
        if (/^(nota|notas|note|adicionar\s+nota|nova\s+nota)\b/i.test(cmdRaw)) {
          const restoCmd = cmdRaw.replace(/^(nota|notas|note|adicionar\s+nota|nova\s+nota)\s*/i, '').replace(/^add\s+/i, '').trim();
          const { textoLimpo, flags } = extrairFlagsCLI(restoCmd);
          const pastaDestino = flags.pasta || '01_Inbox';
          if (textoLimpo) {
            await criarNotaInstantanea(pastaDestino, '99_Meta/Templates/Template - Inbox.md', textoLimpo);
          }
          limparEFechar();
          return;
        }

        // 1.3 PROJETO
        if (/^(projeto|projetos|project|adicionar\s+projeto|novo\s+projeto)\b/i.test(cmdRaw)) {
          const nomeProjeto = cmdRaw.replace(/^(projeto|projetos|project|adicionar\s+projeto|novo\s+projeto)\s*/i, '').replace(/^add\s+/i, '').trim();
          if (nomeProjeto) {
            await criarNotaInstantanea('02_Projetos', '99_Meta/Templates/Template - Projeto.md', nomeProjeto);
          }
          limparEFechar();
          return;
        }

        // 1.4 ESTUDO
        if (/^(estudo|estudos|materia|adicionar\s+estudo)\b/i.test(cmdRaw)) {
          const nomeEstudo = cmdRaw.replace(/^(estudo|estudos|materia|adicionar\s+estudo)\s*/i, '').replace(/^add\s+/i, '').trim();
          if (nomeEstudo) {
            await criarNotaInstantanea('03_Estudos', '99_Meta/Templates/Template - Estudo.md', nomeEstudo);
          }
          limparEFechar();
          return;
        }

        // 1.5 POMODORO COMANDOS (start, pause, reset, proximo, skip)
        if (/^pomodoro\s+(start|play|pause|reset|proximo|skip)\b/i.test(cmdRaw)) {
          const acao = cmdRaw.match(/^pomodoro\s+([a-zA-Z]+)/i)[1].toLowerCase();
          if (ctx.events) ctx.events.emit('pomodoro:comando', { acao });
          if (typeof Notice !== 'undefined') new Notice(`[Snoopy] Pomodoro: ${acao.toUpperCase()}`);
          limparEFechar();
          return;
        }

        // 1.6 FOCO / FILA
        const matchFoco = cmdRaw.match(/^(foco|pomodoro\s+foco)\s*(.*)$/i);
        const matchFila = cmdRaw.match(/^(fila|pomodoro\s+fila)\s*(.*)$/i);
        if (matchFoco || matchFila) {
          const isFila = Boolean(matchFila);
          const alvo = (isFila ? matchFila[2] : matchFoco[2]).trim();
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

        // 1.7 KANBAN
        if (/^kanban\b/i.test(cmdRaw)) {
          const kanbanEl = document.querySelector('.snoopy-kanban-hub') || document.querySelector('.snoopy-kanban-board');
          if (kanbanEl) {
            kanbanEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          if (typeof Notice !== 'undefined') new Notice('[Snoopy] Quadro Kanban visualizado');
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
        const cmdRaw = valor.slice(1).trim();

        // 1.1 TAREFAS
        if (/^(tarefa|tarefas|task|adicionar\s+tarefa|adicionar\s+nota\s+tarefa|add\s+tarefa)\b/i.test(cmdRaw)) {
          const restoCmd = cmdRaw.replace(/^(tarefa|tarefas|task|adicionar\s+tarefa|adicionar\s+nota\s+tarefa|add\s+tarefa)\s*/i, '').trim();

          if (/^(done|concluir)\b/i.test(restoCmd)) {
            const termoBusca = restoCmd.replace(/^(done|concluir)\s*/i, '').trim();
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

          const textoArg = restoCmd.replace(/^add\s+/i, '').trim();
          const { textoLimpo, flags } = extrairFlagsCLI(textoArg);
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

        // 1.2 NOTAS
        if (/^(nota|notas|note|adicionar\s+nota|nova\s+nota)\b/i.test(cmdRaw)) {
          const restoCmd = cmdRaw.replace(/^(nota|notas|note|adicionar\s+nota|nova\s+nota)\s*/i, '').replace(/^add\s+/i, '').trim();
          const { textoLimpo, flags } = extrairFlagsCLI(restoCmd);
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

        // 1.3 PROJETOS
        if (/^(projeto|projetos|project|adicionar\s+projeto|novo\s+projeto)\b/i.test(cmdRaw)) {
          const nomeProjeto = cmdRaw.replace(/^(projeto|projetos|project|adicionar\s+projeto|novo\s+projeto)\s*/i, '').replace(/^add\s+/i, '').trim();
          comandoAtivo = { executar: () => executarAcao(input.value) };

          const itemEl = previewBox.createEl('div', { cls: 'snoopy-omni-item active' });
          itemEl.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="snoopy-chip snoopy-chip-purple">[Novo Projeto]</span>
              <span style="font-size: 13px; color: #ffffff;">${nomeProjeto ? `Criar projeto: <strong>"${nomeProjeto}"</strong> em 02_Projetos` : 'Digite o nome do projeto...'}</span>
            </div>
            <span class="snoopy-micro" style="color: #d8b4fe; font-weight: 700;">Enter ↵</span>
          `;
          itemEl.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); executarAcaoAtual(); });
          itemEl.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); executarAcaoAtual(); });
          previewBox.style.display = 'flex';
          return;
        }

        // 1.4 ESTUDOS
        if (/^(estudo|estudos|materia|adicionar\s+estudo)\b/i.test(cmdRaw)) {
          const nomeEstudo = cmdRaw.replace(/^(estudo|estudos|materia|adicionar\s+estudo)\s*/i, '').replace(/^add\s+/i, '').trim();
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

        // 1.5 POMODORO COMANDOS
        if (/^pomodoro\s+(start|play|pause|reset|proximo|skip)\b/i.test(cmdRaw)) {
          const acao = cmdRaw.match(/^pomodoro\s+([a-zA-Z]+)/i)[1].toLowerCase();
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

        // 1.6 FOCO / FILA
        const matchFoco = cmdRaw.match(/^(foco|pomodoro\s+foco)\s*(.*)$/i);
        const matchFila = cmdRaw.match(/^(fila|pomodoro\s+fila)\s*(.*)$/i);
        if (matchFoco || matchFila) {
          const isFila = Boolean(matchFila);
          const alvo = (isFila ? matchFila[2] : matchFoco[2]).trim();
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

        // 1.7 KANBAN
        if (/^kanban\b/i.test(cmdRaw)) {
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

        // 1.8 MENU DE AJUDA CLI
        const opcoes = [
          { cmd: '> tarefa add Ler livro --prio alta --data 2026-10-25', desc: 'Criar tarefa com prioridade e data', badge: 'snoopy-chip-green' },
          { cmd: '> tarefa done Algoritmos', desc: 'Concluir tarefa pelo nome', badge: 'snoopy-chip-green' },
          { cmd: '> nota add Minha Ideia --pasta 01_Inbox', desc: 'Criar nova nota em pasta específica', badge: 'snoopy-chip-blue' },
          { cmd: '> projeto add Dashboard', desc: 'Criar projeto com template estruturado', badge: 'snoopy-chip-purple' },
          { cmd: '> foco Resolver Issue #42', desc: 'Definir alvo do Pomodoro', badge: 'snoopy-chip-orange' },
          { cmd: '> fila add Revisar código', desc: 'Adicionar à Playlist do Pomodoro (Spotify vibe)', badge: 'snoopy-chip-orange' },
          { cmd: '> pomodoro start', desc: 'Iniciar contagem do timer', badge: 'snoopy-chip-orange' },
          { cmd: '> kanban', desc: 'Rolar até o painel Kanban', badge: 'snoopy-chip-purple' }
        ];

        opcoes.forEach(op => {
          const itemEl = previewBox.createEl('div', { cls: 'snoopy-omni-item' });
          itemEl.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="snoopy-chip ${op.badge}">${op.cmd.split(' ')[1] || op.cmd}</span>
              <span class="snoopy-meta" style="color: #d4d4d8;">${op.desc}</span>
            </div>
            <span class="snoopy-micro" style="color: var(--snoopy-muted);">${op.cmd}</span>
          `;
          itemEl.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            input.value = op.cmd;
            input.focus();
            input.dispatchEvent(new Event('input'));
          });
        });
        previewBox.style.display = 'flex';
        return;
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
          if (typeof Notice !== 'undefined') new Notice(`Nota de hoje aberta: ${dailyFile.basename}`);
        } else if (item.action === 'sub_estudos') {
          await app.workspace.openLinkText("03_Estudos/Painel de Estudos.md", "", false);
          if (typeof Notice !== 'undefined') new Notice('Painel de Estudos aberto');
        } else if (item.action === 'config') {
          await app.workspace.openLinkText("99_Meta/⚙️ Configurações.md", "", false);
          if (typeof Notice !== 'undefined') new Notice('Configurações do Snoopy Vault abertas');
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

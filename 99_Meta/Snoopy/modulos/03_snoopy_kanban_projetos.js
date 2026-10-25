/**
 * Snoopy Vault - Módulo 03: Kanban de Iniciativas (Projetos & Estudos)
 * Gerencia colunas de progresso reativas, drag & drop HTML5 nativo no Desktop,
 * suporte touch/mobile via menu de ação rápida (⋮) e sincronização com metadados do Vault.
 *
 * @module modulos/03_snoopy_kanban_projetos
 */
return {
  id: 'snoopy_kanban_projetos',
  titulo: 'Kanban de Iniciativas',

  /**
   * Ponto de entrada do ciclo de vida de renderização do Módulo 03.
   *
   * @param {object} ctx - Contexto compartilhado da dashboard.
   * @param {HTMLElement} ctx.root - Contêiner raiz DOM.
   * @param {object} ctx.app - Instância do Obsidian.
   * @param {object} ctx.dv - Instância do Dataview Inline API.
   * @param {string} ctx.todayStr - Data atual no formato ISO.
   * @param {function(HTMLElement, string, object=): HTMLElement} [ctx.renderIcon] - Renderizador de ícones.
   * @returns {Promise<void>}
   */
  async render(ctx) {
    const { root, app, dv, todayStr } = ctx;

    // SEÇÃO KANBAN
    const kanbanSection = root.createEl('div', { cls: 'snoopy-kanban-section' });
    const kanbanHeader = kanbanSection.createEl('div', { cls: 'snoopy-card-header' });

    let currentScope = 'projetos'; // 'projetos' | 'estudos' | 'atividades' | 'todos'

    kanbanHeader.innerHTML = `
      <div class="snoopy-card-header-main">
        <div class="snoopy-toolbar" style="flex-wrap: wrap;">
          ${ctx.UIKit && ctx.UIKit.ICONS && ctx.UIKit.ICONS['kanban'] ? `<span class="snoopy-icon" style="width: 16px; height: 16px; color: var(--snoopy-muted);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">${ctx.UIKit.ICONS['kanban']}</svg></span>` : ''}
          <span class="snoopy-section-title">KANBAN</span>
          <div id="kanban-scope-pills" class="snoopy-toolbar">
            <button id="scope-btn-projetos" class="snoopy-btn-mode snoopy-btn-sm active">Projetos</button>
            <button id="scope-btn-estudos" class="snoopy-btn-mode snoopy-btn-sm">Estudos</button>
            <button id="scope-btn-atividades" class="snoopy-btn-mode snoopy-btn-sm">Atividades</button>
            <button id="scope-btn-todos" class="snoopy-btn-mode snoopy-btn-sm">Todos</button>
          </div>
        </div>
        <span class="snoopy-card-subtitle">Fluxo contínuo de iniciativas</span>
      </div>
      <div class="snoopy-toolbar">
        <button id="snoopy-add-status-btn" class="snoopy-nav-pill-btn snoopy-btn-sm" title="Adicionar nova coluna de status">+ COLUNA</button>
      </div>
    `;

    // Alternador de escopo
    const scopeBtnProjetos = kanbanHeader.querySelector('#scope-btn-projetos');
    const scopeBtnEstudos = kanbanHeader.querySelector('#scope-btn-estudos');
    const scopeBtnAtividades = kanbanHeader.querySelector('#scope-btn-atividades');
    const scopeBtnTodos = kanbanHeader.querySelector('#scope-btn-todos');

    function setScope(scope) {
      currentScope = scope;
      if (scopeBtnProjetos) scopeBtnProjetos.classList.toggle('active', scope === 'projetos');
      if (scopeBtnEstudos) scopeBtnEstudos.classList.toggle('active', scope === 'estudos');
      if (scopeBtnAtividades) scopeBtnAtividades.classList.toggle('active', scope === 'atividades');
      if (scopeBtnTodos) scopeBtnTodos.classList.toggle('active', scope === 'todos');
      renderKanban();
    }

    if (scopeBtnProjetos) scopeBtnProjetos.addEventListener('click', () => setScope('projetos'));
    if (scopeBtnEstudos) scopeBtnEstudos.addEventListener('click', () => setScope('estudos'));
    if (scopeBtnAtividades) scopeBtnAtividades.addEventListener('click', () => setScope('atividades'));
    if (scopeBtnTodos) scopeBtnTodos.addEventListener('click', () => setScope('todos'));

    const kanbanColsGrid = kanbanSection.createEl('div', { cls: 'snoopy-kanban-cols' });

    const defaultCols = [
      { status: 'Em Andamento', label: 'Em Andamento', dotColor: '#ffffff' },
      { status: 'Planejamento', label: 'Planejamento', dotColor: '#71717a' },
      { status: 'Concluído', label: 'Concluído', dotColor: '#86efac' }
    ];

    async function carregarColunas() {
      const metaPath = "99_Meta/kanban-columns.json";
      let cols = [...defaultCols];
      if (app.vault.getAbstractFileByPath(metaPath)) {
        try {
          const raw = await app.vault.read(app.vault.getAbstractFileByPath(metaPath));
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) cols = parsed;
        } catch(e) {}
      }
      return cols;
    }

    // Modal Nova Coluna de Status
    function abrirModalNovoStatus() {
      if (ctx.ModalFactory) {
        ctx.ModalFactory.abrir({
          maxWidth: '400px',
          htmlContent: `
            <div class="snoopy-card-header">
              <span class="snoopy-section-title">Nova Coluna / Status</span>
              <button class="snoopy-modal-close" title="Fechar"></button>
            </div>
            <div class="snoopy-modal-label">Nome da nova coluna (ex: Backlog, Em Revisão, Pausado):</div>
            <input id="modal-status-input" class="snoopy-form-input" type="text" placeholder="Ex: Backlog" style="width: 100%;">
            <div class="snoopy-toolbar" style="justify-content: flex-end; margin-top: 6px;">
              <button class="snoopy-btn-action snoopy-modal-close snoopy-btn-sm">Cancelar</button>
              <button id="modal-save-status" class="snoopy-btn-primary snoopy-btn-sm">Criar Coluna</button>
            </div>
          `,
          onMontar: (box) => {
            const closeBtn = box.querySelector('.snoopy-modal-close');
            if (closeBtn && ctx.renderIcon) ctx.renderIcon(closeBtn, 'x', { size: 14 });
            const inp = box.querySelector('#modal-status-input');
            if (inp) setTimeout(() => inp.focus(), 50);
          },
          onConfirmar: async (box, fechar) => {
            const inputEl = box.querySelector('#modal-status-input');
            const statusNome = inputEl ? inputEl.value.trim() : '';
            if (!statusNome) return;

            const metaPath = "99_Meta/kanban-columns.json";
            let cols = await carregarColunas();
            if (!cols.some(c => c.status.toLowerCase() === statusNome.toLowerCase())) {
              cols.push({ status: statusNome, label: statusNome, dotColor: '#a1a1aa' });
              let file = app.vault.getAbstractFileByPath(metaPath);
              if (file) {
                await app.vault.modify(file, JSON.stringify(cols, null, 2));
              } else {
                await app.vault.create(metaPath, JSON.stringify(cols, null, 2));
              }
              new Notice(`Coluna "${statusNome}" criada!`);
              fechar();
              renderKanban();
            } else {
              new Notice(`A coluna "${statusNome}" já existe!`);
            }
          }
        });
      }
    }

    const addStatusBtn = kanbanHeader.querySelector('#snoopy-add-status-btn');
    if (addStatusBtn) addStatusBtn.addEventListener('click', abrirModalNovoStatus);

    // Modal Inteligente: Criar Item no Kanban com Detalhamento Opcional
    function abrirModalNovoItem(colStatus) {
      const tipoPadrao = currentScope === 'estudos' ? 'estudo' : 'projeto';

      if (ctx.ModalFactory) {
        ctx.ModalFactory.abrir({
          maxWidth: '440px',
          htmlContent: `
            <div class="snoopy-card-header">
              <span class="snoopy-section-title">Novo Item em "${colStatus}"</span>
              <button class="snoopy-modal-close" title="Fechar"></button>
            </div>

            <div class="snoopy-modal-label">Título do Projeto / Estudo:</div>
            <input id="modal-item-title" class="snoopy-form-input" type="text" placeholder="Ex: Algoritmos II, Refatorar Backend..." style="width: 100%;">
            
            <div style="display: flex; gap: 8px;">
              <div style="flex: 1;">
                <div class="snoopy-modal-label">Tipo / Escopo:</div>
                <select id="modal-item-type" class="snoopy-form-input" style="width: 100%; padding: 6px; font-size: 11.5px;">
                  <option value="projeto" ${tipoPadrao === 'projeto' ? 'selected' : ''}>Projeto (02_Projetos)</option>
                  <option value="estudo" ${tipoPadrao === 'estudo' ? 'selected' : ''}>Estudo (03_Estudos)</option>
                </select>
              </div>
              <div style="flex: 1;">
                <div class="snoopy-modal-label">Prioridade:</div>
                <select id="modal-item-prio" class="snoopy-form-input" style="width: 100%; padding: 6px; font-size: 11.5px;">
                  <option value="Alta">Alta</option>
                  <option value="Média" selected>Média</option>
                  <option value="Baixa">Baixa</option>
                </select>
              </div>
            </div>

            <div>
              <div class="snoopy-modal-label">Prazo Final:</div>
              <input id="modal-item-due" class="snoopy-form-input" type="date" style="width: 100%; padding: 6px; font-size: 11.5px;">
            </div>

            <div class="snoopy-toolbar" style="justify-content: flex-end; margin-top: 6px;">
              <button class="snoopy-btn-action snoopy-modal-close snoopy-btn-sm">Cancelar</button>
              <button id="modal-save-item" class="snoopy-btn-primary snoopy-btn-sm">Criar Item</button>
            </div>
          `,
          onMontar: (box) => {
            const titleEl = box.querySelector('#modal-item-title');
            if (titleEl) setTimeout(() => titleEl.focus(), 50);
          },
          onConfirmar: async (box, fechar) => {
            const titleEl = box.querySelector('#modal-item-title');
            const typeEl = box.querySelector('#modal-item-type');
            const prioEl = box.querySelector('#modal-item-prio');
            const dueEl = box.querySelector('#modal-item-due');
            
            const rawTitle = titleEl ? titleEl.value.trim() : '';
            const tipo = typeEl ? typeEl.value : 'projeto';
            const prio = prioEl ? prioEl.value : 'Média';
            const due = dueEl ? dueEl.value : '';

            if (rawTitle) {
              const folder = tipo === 'estudo' ? "03_Estudos" : "02_Projetos";
              const tplPath = tipo === 'estudo' ? "99_Meta/Templates/Template - Estudo.md" : "99_Meta/Templates/Template - Projeto.md";
              
              if (!app.vault.getAbstractFileByPath(folder)) {
                await app.vault.createFolder(folder).catch(() => {});
              }
              
              const targetPath = `${folder}/${rawTitle}.md`;
              const tplFile = app.vault.getAbstractFileByPath(tplPath);
              let content = "";
              const dueFormatado = due ? (ctx.DateUtils ? ctx.DateUtils.formatarDDMMYYYY(due) : due) : '';
              const todayFormatado = ctx.DateUtils ? ctx.DateUtils.formatarDDMMYYYY(todayStr) : todayStr;

              if (tplFile) {
                const rawTpl = await app.vault.read(tplFile);
                content = rawTpl.replace(/{{title}}/g, rawTitle)
                                .replace(/{{date}}/g, todayFormatado)
                                .replace(/status:\s*["'][^"']+["']/, `status: "${colStatus}"`)
                                .replace(/priority:\s*["'][^"']+["']/, `priority: "${prio}"`);
                if (dueFormatado) {
                  content = content.replace(/due_date:\s*([^\n]*)/, `due_date: ${dueFormatado}`);
                }
              } else {
                content = `---\ntitle: "${rawTitle}"\nstatus: "${colStatus}"\npriority: "${prio}"\ndue_date: ${dueFormatado}\ntags: [${tipo}]\n---\n\n# ${rawTitle}\n\n`;
              }

              const newFile = await app.vault.create(targetPath, content);
              new Notice(`[Snoopy] "${rawTitle}" criado em ${colStatus}!`);
              fechar();
              await app.workspace.openLinkText(newFile.path, "", false);
              renderKanban();
            }
          }
        });
      }
    }

    // Modal de Ação Tátil Mobile: Mover Status com 1-Toque (Notas e Atividades)
    function abrirModalMoverStatus(itemOuFile, colunas, currentStatus) {
      const isTask = Boolean(itemOuFile && itemOuFile.isTask);
      const filePath = isTask ? itemOuFile.file.path : itemOuFile.path;
      const file = app.vault.getAbstractFileByPath(filePath);
      const nomeItem = isTask ? itemOuFile.title : itemOuFile.basename;

      if (!file) return;

      if (ctx.ModalFactory) {
        ctx.ModalFactory.abrir({
          maxWidth: '320px',
          htmlContent: `
            <div class="snoopy-card-header">
              <span class="snoopy-section-title">Mover "${nomeItem}":</span>
              <button class="snoopy-modal-close" title="Fechar"></button>
            </div>
            <div id="modal-move-options" style="display: flex; flex-direction: column; gap: 6px; margin-top: 8px;"></div>
          `,
          onMontar: (box, fechar) => {
            const closeBtn = box.querySelector('.snoopy-modal-close');
            if (closeBtn && ctx.renderIcon) ctx.renderIcon(closeBtn, 'x', { size: 14 });

            const optBox = box.querySelector('#modal-move-options');
            colunas.forEach(col => {
              const isCurrent = col.status.toLowerCase() === currentStatus.toLowerCase();
              const btn = optBox.createEl('button', {
                cls: `snoopy-btn-action`,
                attr: { style: `width: 100%; justify-content: flex-start; padding: 8px 12px; font-size: 12px; ${isCurrent ? 'opacity: 0.5; border-color: #86efac;' : ''}` }
              });
              if (ctx.renderIcon) {
                ctx.renderIcon(btn, isCurrent ? 'check' : 'arrow-right', { size: 12, color: isCurrent ? '#86efac' : 'currentColor' });
              }
              btn.createEl('span', { text: col.label });

              if (!isCurrent) {
                btn.addEventListener('click', async () => {
                  if (isTask) {
                    if (ctx.VaultStore && typeof ctx.VaultStore.substituirLinha === 'function') {
                      await ctx.VaultStore.substituirLinha(app, file, l => l.includes(itemOuFile.taskRef.text), l => {
                        let novaLinha = l;
                        if (col.status === 'Concluído') {
                          novaLinha = novaLinha.replace(/- \[ \]/, `- [x] ✅ ${todayStr}`);
                        } else if (col.status === 'Em Andamento') {
                          novaLinha = novaLinha.replace(/- \[x\]/, '- [ ]');
                          if (!novaLinha.includes('#andamento')) novaLinha += ' #andamento';
                        } else {
                          novaLinha = novaLinha.replace(/- \[x\]/, '- [ ]').replace(/#andamento\b/g, '').trim();
                        }
                        return novaLinha;
                      });
                    }
                  } else {
                    const raw = await app.vault.read(file);
                    let updated = raw;
                    if (/status:\s*["']?([^"'\n]+)["']?/.test(raw)) {
                      updated = raw.replace(/status:\s*["']?([^"'\n]+)["']?/, `status: "${col.status}"`);
                    } else if (raw.startsWith('---')) {
                      updated = raw.replace(/^---\n/, `---\nstatus: "${col.status}"\n`);
                    } else {
                      updated = `---\nstatus: "${col.status}"\n---\n\n` + raw;
                    }
                    await app.vault.modify(file, updated);
                  }
                  new Notice(`[Snoopy] "${nomeItem}" movido para ${col.label}!`);
                  fechar();
                  renderKanban();
                });
              }
            });

            // Opção de exclusão do card/nota
            const sepBox = optBox.createEl('div', {
              attr: { style: 'margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.08);' }
            });
            const btnExcluir = sepBox.createEl('button', {
              cls: 'snoopy-btn-danger',
              attr: {
                style: 'width: 100%; justify-content: flex-start; padding: 8px 12px; font-size: 12px;'
              }
            });
            if (ctx.renderIcon) {
              ctx.renderIcon(btnExcluir, 'trash-2', { size: 13, color: '#f87171' });
            }
            btnExcluir.createEl('span', { text: isTask ? 'Excluir Tarefa' : 'Excluir Card' });

            btnExcluir.addEventListener('click', async () => {
              try {
                if (isTask) {
                  if (ctx.VaultStore && typeof ctx.VaultStore.removerLinha === 'function') {
                    await ctx.VaultStore.removerLinha(app, file, l => l.includes(itemOuFile.taskRef.text));
                  }
                  new Notice(`[Snoopy] Tarefa excluída!`);
                } else {
                  if (ctx.VaultStore && typeof ctx.VaultStore.excluirArquivo === 'function') {
                    await ctx.VaultStore.excluirArquivo(app, file.path);
                  } else if (app.vault.trash) {
                    await app.vault.trash(file, true);
                  }
                  new Notice(`[Snoopy] "${file.basename}" excluído do Kanban!`);
                }
                fechar();
                renderKanban();
              } catch(err) {
                new Notice(`Erro ao excluir: ${err.message}`);
              }
            });
          }
        });
      }
    }

    function formatarPrazo(dataStr) {
      if (!dataStr) return null;
      let clean = String(dataStr).trim();
      if (clean.includes('T')) clean = clean.split('T')[0];
      const matchIso = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (matchIso) {
        const y = matchIso[1];
        const m = matchIso[2].padStart(2, '0');
        const d = matchIso[3].padStart(2, '0');
        return { label: `Prazo: ${d}-${m}-${y}`, isoDate: `${y}-${m}-${d}` };
      }
      const matchBr = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
      if (matchBr) {
        const d = matchBr[1].padStart(2, '0');
        const m = matchBr[2].padStart(2, '0');
        const y = matchBr[3];
        return { label: `Prazo: ${d}-${m}-${y}`, isoDate: `${y}-${m}-${d}` };
      }
      return { label: `Prazo: ${clean}`, isoDate: clean };
    }

    async function renderKanban() {
      kanbanColsGrid.innerHTML = '';
      
      let allItems = [];

      // 1. Coleta notas de projetos e estudos quando o escopo permitir
      if (currentScope !== 'atividades' && dv && typeof dv.pages === 'function') {
        let pagesQuery = [];
        if (currentScope === 'projetos') {
          pagesQuery = dv.pages('"02_Projetos"').where(p => !p.file.name.includes("Template") && !p.file.name.includes("Painel"));
        } else if (currentScope === 'estudos') {
          pagesQuery = dv.pages('"03_Estudos"').where(p => !p.file.name.includes("Template") && !p.file.name.includes("Painel"));
        } else {
          pagesQuery = dv.pages('"02_Projetos" or "03_Estudos"').where(p => !p.file.name.includes("Template") && !p.file.name.includes("Painel"));
        }
        pagesQuery.forEach(p => allItems.push(p));
      }

      // 2. Coleta atividades avulsas e tarefas marcadas para o Kanban
      try {
        if (dv && typeof dv.pages === 'function') {
          let escopoBusca = null;
          if (currentScope === 'projetos') {
            escopoBusca = dv.pages('"02_Projetos"');
          } else if (currentScope === 'estudos') {
            escopoBusca = dv.pages('"03_Estudos"');
          } else {
            escopoBusca = dv.pages('"01_Inbox" or "02_Projetos" or "03_Estudos"');
          }

          const rawTasks = escopoBusca.where(p => p.file && !p.file.name.includes("Template") && !p.file.name.includes("Painel")).file.tasks;
          const tasksFiltradas = rawTasks.where(t => {
            if (!t.text) return false;
            const temTagKanban = /#kanban\b/i.test(t.text);
            if (currentScope === 'atividades') {
              return temTagKanban || (t.path && (t.path.includes('01_Inbox') || t.path.includes('Diário')));
            }
            return temTagKanban;
          });

          tasksFiltradas.forEach(t => {
            let statusTarefa = 'Planejamento';
            if (t.completed) {
              statusTarefa = 'Concluído';
            } else if (/#andamento\b/i.test(t.text) || /#foco\b/i.test(t.text)) {
              statusTarefa = 'Em Andamento';
            }

            const cleanTitle = t.text.replace(/#\w+/g, '').replace(/📅[^\s]+/g, '').replace(/\[[^\]]+\]/g, '').replace(/🍅[^\s]+/g, '').replace(/[⏫🔼🔽]/g, '').trim();
            const filePath = t.path || (t.link ? t.link.path : '');

            allItems.push({
              isTask: true,
              taskRef: t,
              file: {
                name: cleanTitle,
                path: filePath,
                tasks: []
              },
              title: cleanTitle,
              status: statusTarefa,
              priority: t.text.includes('⏫') ? 'Alta' : (t.text.includes('🔽') ? 'Baixa' : 'Média'),
              completed: t.completed,
              due_date: (t.text.match(/(?:due:|📅)\s*(\d{4}-\d{2}-\d{2}|\d{2}[-/]\d{2}[-/]\d{4})/) || [])[1] || null
            });
          });
        }
      } catch (err) {
        console.warn('[Kanban] Falha ao coletar tarefas avulsas:', err);
      }

      const cols = await carregarColunas();

      // Inclui status orfãos dinamicamente se houver
      allItems.forEach(p => {
        if (p.status && !cols.some(c => c.status.toLowerCase() === p.status.toLowerCase())) {
          cols.push({ status: p.status, label: p.status, dotColor: '#a1a1aa' });
        }
      });

      cols.forEach(col => {
        const colEl = kanbanColsGrid.createEl('div', { cls: 'snoopy-kanban-col' });
        
        // Drag over / drop para Desktop
        colEl.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          colEl.style.borderColor = 'rgba(255, 255, 255, 0.3)';
          colEl.style.background = 'var(--background-secondary-alt)';
        });

        colEl.addEventListener('dragleave', () => {
          colEl.style.borderColor = 'var(--background-modifier-border)';
          colEl.style.background = 'var(--background-primary-alt)';
        });

        colEl.addEventListener('drop', async (e) => {
          e.preventDefault();
          colEl.style.borderColor = 'var(--background-modifier-border)';
          colEl.style.background = 'var(--background-primary-alt)';
          
          const rawData = e.dataTransfer.getData('text/plain');
          if (!rawData) return;

          let dropItem = null;
          try {
            dropItem = JSON.parse(rawData);
          } catch (_) {
            dropItem = { isTask: false, path: rawData };
          }

          const file = app.vault.getAbstractFileByPath(dropItem.path);
          if (!file) return;

          if (dropItem.isTask && dropItem.taskText) {
            if (ctx.VaultStore && typeof ctx.VaultStore.substituirLinha === 'function') {
              await ctx.VaultStore.substituirLinha(app, file, l => l.includes(dropItem.taskText), l => {
                let novaLinha = l;
                if (col.status === 'Concluído') {
                  novaLinha = novaLinha.replace(/- \[ \]/, `- [x] ✅ ${todayStr}`);
                } else if (col.status === 'Em Andamento') {
                  novaLinha = novaLinha.replace(/- \[x\]/, '- [ ]');
                  if (!novaLinha.includes('#andamento')) novaLinha += ' #andamento';
                } else {
                  novaLinha = novaLinha.replace(/- \[x\]/, '- [ ]').replace(/#andamento\b/g, '').trim();
                }
                return novaLinha;
              });
            }
          } else {
            const raw = await app.vault.read(file);
            let updated = raw;
            if (/status:\s*["']?([^"'\n]+)["']?/.test(raw)) {
              updated = raw.replace(/status:\s*["']?([^"'\n]+)["']?/, `status: "${col.status}"`);
            } else if (raw.startsWith('---')) {
              updated = raw.replace(/^---\n/, `---\nstatus: "${col.status}"\n`);
            } else {
              updated = `---\nstatus: "${col.status}"\n---\n\n` + raw;
            }
            await app.vault.modify(file, updated);
          }
          new Notice(`[Snoopy] Item movido para ${col.label}!`);
          setTimeout(renderKanban, 150);
        });

        const filtered = allItems.filter(p => {
          const s = (p.status || 'Planejamento').toLowerCase();
          return s.includes(col.status.toLowerCase());
        });

        const colHeader = colEl.createEl('div', { 
          attr: { style: 'display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 1px solid var(--background-modifier-border);' } 
        });
        colHeader.innerHTML = `
          <span style="font-size: 13px; font-weight: 700; color: ${col.status === 'Concluído' ? '#86efac' : 'var(--text-normal)'}; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 7px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${col.dotColor};"></span>
            ${col.label}
          </span>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="snoopy-micro" style="padding: 2px 7px; border-radius: 4px; background: rgba(128,128,128,0.12); color: var(--text-normal); font-weight: bold;">
              ${filtered.length}
            </span>
            <button class="snoopy-col-add-btn" title="Criar novo item em ${col.label}">+</button>
          </div>
        `;

        const addColBtn = colHeader.querySelector('.snoopy-col-add-btn');
        if (addColBtn) {
          addColBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            abrirModalNovoItem(col.status);
          });
        }

        const cardsContainer = colEl.createEl('div', { cls: 'snoopy-kanban-cards-box' });

        if (filtered.length === 0) {
          cardsContainer.createEl('div', { 
            text: 'Nenhum item nesta coluna', 
            attr: { class: 'snoopy-meta', style: 'color: var(--text-faint); text-align: center; padding: 24px 0;' } 
          });
        } else {
          filtered.forEach(proj => {
            const card = cardsContainer.createEl('div', { cls: 'snoopy-kanban-card' });
            
            // Suporte desktop drag
            card.setAttribute('draggable', 'true');
            card.addEventListener('dragstart', (e) => {
              const dragPayload = proj.isTask
                ? JSON.stringify({ isTask: true, path: proj.file.path, taskText: proj.taskRef ? proj.taskRef.text : '' })
                : proj.file.path;
              e.dataTransfer.setData('text/plain', dragPayload);
              card.style.opacity = '0.4';
            });
            card.addEventListener('dragend', () => {
              card.style.opacity = '1';
            });

            card.addEventListener('click', () => {
              if (!card.matches(':active')) {
                app.workspace.openLinkText(proj.file.path, "", false);
              }
            });

            const titleRow = card.createEl('div', { attr: { style: 'display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;' } });
            
            const prioRaw = proj.priority || proj.prioridade || 'Média';
            const prioNormalized = prioRaw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
            const prioClass = (prioNormalized === 'alta') ? 'prio-alta' : (prioNormalized === 'baixa') ? 'prio-baixa' : 'prio-media';

            const leftTitle = titleRow.createEl('div', { attr: { style: 'display: flex; flex-direction: column; gap: 2px;' } });
            
            if (proj.isTask) {
              leftTitle.createEl('span', {
                cls: 'prio-badge',
                text: 'Atividade',
                attr: {
                  style: 'align-self: flex-start; background: rgba(96, 165, 250, 0.15); color: #93c5fd; border: 1px solid rgba(96, 165, 250, 0.3); font-size: 9.5px; padding: 1px 5px; margin-bottom: 2px;'
                }
              });
            }

            leftTitle.createEl('span', { 
              text: proj.title || proj.file.name,
              attr: { style: 'font-size: 13.5px; font-weight: 700; color: var(--text-normal); line-height: 1.3;' } 
            });

            const rightActions = titleRow.createEl('div', { attr: { style: 'display: flex; align-items: center; gap: 5px; flex-shrink: 0;' } });
            rightActions.createEl('span', { cls: `prio-badge ${prioClass}`, text: prioRaw });

            // Botão tátil mobile
            const touchBtn = rightActions.createEl('button', {
              cls: 'snoopy-col-add-btn',
              attr: { title: 'Mover status (toque)', style: 'width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center;' }
            });
            if (ctx.renderIcon) ctx.renderIcon(touchBtn, 'more-vertical', { size: 12 });
            else touchBtn.textContent = '⋮';

            touchBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              if (proj.isTask) {
                abrirModalMoverStatus(proj, cols, col.status);
              } else {
                const fileRef = app.vault.getAbstractFileByPath(proj.file.path);
                if (fileRef) abrirModalMoverStatus(fileRef, cols, col.status);
              }
            });

            // Análise de tarefas vinculadas & alertas de atraso (somente para projetos/notas completas)
            if (!proj.isTask) {
              const tasks = proj.file.tasks || [];
              const totalTasks = tasks.length || 0;
              const completedTasks = typeof tasks.where === 'function'
                ? tasks.where(t => t.completed).length
                : (Array.isArray(tasks) ? tasks.filter(t => t.completed).length : 0);
              const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : (col.status === 'Concluído' ? 100 : 0);

              // Verifica se há tarefas atrasadas dentro deste projeto
              const tarefasAtrasadas = typeof tasks.where === 'function'
                ? tasks.where(t => {
                    if (t.completed) return false;
                    const match = t.text && t.text.match(/📅\s*(\d{4}-\d{2}-\d{2})/);
                    return match && match[1] < todayStr;
                  }).length
                : (Array.isArray(tasks) ? tasks.filter(t => {
                    if (t.completed) return false;
                    const match = t.text && t.text.match(/📅\s*(\d{4}-\d{2}-\d{2})/);
                    return match && match[1] < todayStr;
                  }).length : 0);

              const progRow = card.createEl('div');
              progRow.innerHTML = `
                <div class="snoopy-meta" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span>${totalTasks > 0 ? `${completedTasks}/${totalTasks} tarefas` : 'Progresso'}</span>
                    ${tarefasAtrasadas > 0 ? `<span class="prio-badge prio-alta" style="font-size: 9.5px; padding: 1px 4px; display: inline-flex; align-items: center; gap: 3px;" title="Tarefas com prazo vencido">${tarefasAtrasadas} atrasada${tarefasAtrasadas > 1 ? 's' : ''}</span>` : ''}
                  </div>
                  <span style="font-weight: bold; color: ${pct === 100 ? '#86efac' : 'var(--text-normal)'};">${pct}%</span>
                </div>
                <div class="snoopy-prog-track" style="height: 5px; width: 100%;">
                  <div class="snoopy-prog-fill" style="width: ${pct}%; background: ${pct === 100 ? '#86efac' : 'var(--text-normal)'};"></div>
                </div>
              `;
            }

            if (proj.due_date) {
              const info = formatarPrazo(proj.due_date);
              if (info) {
                const dueRow = card.createEl('div', { 
                  attr: { 
                    class: 'snoopy-meta',
                    style: 'display: flex; justify-content: space-between; align-items: center; padding-top: 4px; border-top: 1px solid var(--background-modifier-border); cursor: pointer;' 
                  } 
                });
                
                const dueSpan = dueRow.createEl('span', {
                  attr: {
                    style: 'display: inline-flex; align-items: center; gap: 4px; color: var(--interactive-accent, #60a5fa); text-decoration: underline; text-underline-offset: 2px;',
                    title: 'Abrir data no Calendar'
                  }
                });
                if (ctx.renderIcon) {
                  ctx.renderIcon(dueSpan, 'calendar', { size: 11, color: '#60a5fa' });
                }
                dueSpan.createEl('span', { text: info.label });

                dueRow.addEventListener('click', (e) => {
                  e.stopPropagation();
                  app.workspace.openLinkText(`01_Inbox/Diário/${info.isoDate}.md`, "", false);
                });
              }
            }
          });
        }
      });
    }

    renderKanban();
  }
};


/**
 * Snoopy Vault - Submódulo: Modais de Criação e Ações de Tarefas
 * Isola a lógica dos diálogos de nova tarefa e menu contextual de opções.
 *
 * @module modulos/daily_tracker/tarefas_modal
 */

const REGEX_DATA_TASKS = /\u{1F4C5}\s*(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2})/u;
const REGEX_PRIO_CHARS = /[\u{23EB}\u{1F53C}\u{1F53D}]/gu;

const TarefasModal = {
  /**
   * Abre o diálogo modal para criação de uma nova tarefa com metadados.
   */
  abrirModalNovaTarefa({ app, dv, todayStr, DateUtils, VaultStore, ModalFactory, garantirNotaDiaria, onAtualizar }) {
    let iniciativas = [];
    try {
      const pages = dv.pages('"02_Projetos" or "03_Estudos"')
        .where(p => p.file && !p.file.name.includes('Template') && !p.file.name.includes('Painel'));
      pages.forEach(p => {
        const isEstudo = p.file.path.startsWith('03_Estudos');
        iniciativas.push({
          nome: p.title || p.file.name,
          path: p.file.path,
          icone: isEstudo ? '📚' : '🎯'
        });
      });
      iniciativas.sort((a, b) => a.nome.localeCompare(b.nome));
    } catch(e) {}

    const amanhãStr = DateUtils.somarDias(todayStr, 1);
    const semanaStr = DateUtils.somarDias(todayStr, 7);
    let periodoSelecionado = '';

    const modalHtml = `
      <div class="snoopy-card-header">
        <span class="snoopy-section-title">+ Nova Tarefa</span>
        <button id="modal-close-task" class="snoopy-modal-close" title="Fechar">✕</button>
      </div>

      <div>
        <div class="snoopy-modal-label" style="margin-bottom: 4px;">1. O que precisa ser feito?</div>
        <input id="modal-task-text" type="text" placeholder="Ex: Resolver 15 exercícios de SQL..." style="width: 100%; background: #14141c; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 8px; color: #ffffff; font-size: 12px; outline: none;">
      </div>

      <div>
        <div class="snoopy-modal-label" style="margin-bottom: 5px;">2. Prazo:</div>
        <div id="modal-prazos" style="display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 6px;">
          <button type="button" class="chip-pr" data-prazo="${todayStr}" style="background: var(--interactive-accent, #60a5fa); color: #000; font-weight: bold; border: 1px solid rgba(255,255,255,0.12); border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer;">Hoje (${DateUtils.formatarDDMMYYYY(todayStr)})</button>
          <button type="button" class="chip-pr" data-prazo="${amanhãStr}" style="background: rgba(255,255,255,0.04); color: #e4e4e7; border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer;">Amanhã (${DateUtils.formatarDDMMYYYY(amanhãStr)})</button>
          <button type="button" class="chip-pr" data-prazo="${semanaStr}" style="background: rgba(255,255,255,0.04); color: #e4e4e7; border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer;">Esta Semana (${DateUtils.formatarDDMMYYYY(semanaStr)})</button>
          <button type="button" class="chip-pr" data-prazo="" style="background: rgba(255,255,255,0.04); color: #e4e4e7; border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer;">Sem Prazo</button>
        </div>
        <input id="modal-task-date" type="date" value="${todayStr}" style="width: 100%; background: #14141c; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 7px; color: #ffffff; font-size: 11px; outline: none;">
      </div>

      <div>
        <div class="snoopy-modal-label" style="margin-bottom: 5px;">3. Período do Dia:</div>
        <div id="modal-periodos" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px;">
          <button type="button" class="chip-pe" data-val="🌅 Manhã" style="background: rgba(255,255,255,0.04); color: #a1a1aa; border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; padding: 4px; font-size: 10.5px; font-weight: 600; cursor: pointer;">🌅 Manhã</button>
          <button type="button" class="chip-pe" data-val="☀️ Tarde" style="background: rgba(255,255,255,0.04); color: #a1a1aa; border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; padding: 4px; font-size: 10.5px; font-weight: 600; cursor: pointer;">☀️ Tarde</button>
          <button type="button" class="chip-pe" data-val="🌙 Noite" style="background: rgba(255,255,255,0.04); color: #a1a1aa; border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; padding: 4px; font-size: 10.5px; font-weight: 600; cursor: pointer;">🌙 Noite</button>
          <button type="button" class="chip-pe active" data-val="" style="background: rgba(255,255,255,0.14); color: #ffffff; border: 1px solid rgba(255,255,255,0.22); border-radius: 4px; padding: 4px; font-size: 10.5px; font-weight: 600; cursor: pointer;">⚡ Livre</button>
        </div>
      </div>

      <div style="display: flex; gap: 8px;">
        <div style="flex: 1;">
          <div class="snoopy-modal-label" style="margin-bottom: 4px;">4. Prioridade:</div>
          <select id="modal-task-prio" style="width: 100%; background: #14141c; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11px; outline: none;">
            <option value="⏫">Alta (⏫)</option>
            <option value="🔼" selected>Média (🔼)</option>
            <option value="🔽">Baixa (🔽)</option>
            <option value="">Normal</option>
          </select>
        </div>
        <div style="flex: 1;">
          <div class="snoopy-modal-label" style="margin-bottom: 4px;">5. Meta Pomodoros:</div>
          <select id="modal-task-pomos" style="width: 100%; background: #14141c; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11px; outline: none;">
            <option value="" selected>Sem meta</option>
            <option value="🍅 1">1 Pomodoro (25m)</option>
            <option value="🍅 2">2 Pomodoros (50m)</option>
            <option value="🍅 3">3 Pomodoros (1h15)</option>
          </select>
        </div>
      </div>

      <div>
        <div class="snoopy-modal-label" style="margin-bottom: 4px;">6. Vínculo:</div>
        <select id="modal-task-target" style="width: 100%; background: #14141c; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11px; outline: none;">
          <option value="daily" selected>📝 Diário de Hoje (${DateUtils.formatarDDMMYYYY(todayStr)})</option>
          ${iniciativas.map(ini => `<option value="${ini.path}">${ini.icone} ${ini.nome}</option>`).join('')}
        </select>
      </div>

      <div class="snoopy-toolbar" style="justify-content: flex-end;">
        <button id="modal-cancel-task" class="snoopy-btn-action snoopy-btn-sm">Cancelar</button>
        <button id="modal-save-task" class="snoopy-btn-primary snoopy-btn-sm">Criar Tarefa</button>
      </div>
    `;

    ModalFactory.abrir({
      htmlContent: modalHtml,
      maxWidth: '460px',
      onMontar: (box, fechar) => {
        box.querySelector('#modal-close-task').onclick = fechar;
        box.querySelector('#modal-cancel-task').onclick = fechar;
        const inputEl = box.querySelector('#modal-task-text');
        if (inputEl) setTimeout(() => inputEl.focus(), 40);

        const dateIn = box.querySelector('#modal-task-date');
        box.querySelectorAll('.chip-pr').forEach(chip => {
          chip.onclick = () => {
            dateIn.value = chip.dataset.prazo;
            box.querySelectorAll('.chip-pr').forEach(c => {
              c.style.background = 'rgba(255,255,255,0.04)';
              c.style.color = '#e4e4e7';
              c.style.fontWeight = 'normal';
            });
            chip.style.background = 'var(--interactive-accent, #60a5fa)';
            chip.style.color = '#000';
            chip.style.fontWeight = 'bold';
          };
        });

        box.querySelectorAll('.chip-pe').forEach(chip => {
          chip.onclick = () => {
            periodoSelecionado = chip.dataset.val;
            box.querySelectorAll('.chip-pe').forEach(c => {
              c.style.background = 'rgba(255,255,255,0.04)';
              c.style.color = '#a1a1aa';
              c.style.borderColor = 'rgba(255,255,255,0.08)';
            });
            chip.style.background = 'rgba(255,255,255,0.14)';
            chip.style.color = '#ffffff';
            chip.style.borderColor = 'rgba(255,255,255,0.22)';
          };
        });

        box.querySelector('#modal-save-task').onclick = async () => {
          const texto = inputEl.value.trim();
          const prazo = dateIn.value.trim();
          const prio = box.querySelector('#modal-task-prio').value.trim();
          const pomos = box.querySelector('#modal-task-pomos').value.trim();
          const destino = box.querySelector('#modal-task-target').value;

          if (!texto) {
            new Notice('Informe a descrição da tarefa.');
            return;
          }

          let taskLine = `- [ ] ${texto}`;
          if (periodoSelecionado) taskLine += ` ${periodoSelecionado}`;
          if (pomos) taskLine += ` ${pomos}`;
          if (prazo) taskLine += ` 📅 ${DateUtils.formatarDDMMYYYY(prazo)}`;
          if (prio) taskLine += ` ${prio}`;

          if (destino === 'daily') {
            const dailyFile = await garantirNotaDiaria();
            await VaultStore.adicionarLinhaEmSecao(app, dailyFile, '🎯 Foco Principal de Hoje', taskLine);
            new Notice('📋 Tarefa registrada na nota diária!');
          } else {
            const targetFile = app.vault.getAbstractFileByPath(destino);
            if (targetFile) {
              await VaultStore.adicionarLinhaEmSecao(app, targetFile, 'Tarefas', taskLine);
              new Notice(`🎯 Tarefa vinculada a "${targetFile.basename}"!`);
            }
          }

          fechar();
          if (typeof onAtualizar === 'function') await onAtualizar();
        };
      }
    });
  },

  /**
   * Abre o menu contextual de ações de uma tarefa específica.
   */
  abrirModalMenuTarefa({ item, t, filePath, app, todayStr, DateUtils, VaultStore, ModalFactory, onAtualizar }) {
    const modalHtml = `
      <div class="snoopy-card-header">
        <span class="snoopy-section-title">Ações da Tarefa</span>
        <button id="modal-close-menu" class="snoopy-modal-close" title="Fechar">✕</button>
      </div>

      <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 8px 10px; font-size: 12px; color: #ffffff; font-weight: 500;">
        ${item.cleanText}
      </div>

      <div style="display: flex; flex-direction: column; gap: 6px;">
        <button id="btn-foco-pomo" class="snoopy-btn-primary snoopy-btn-sm" style="text-align: left; justify-content: flex-start; width: 100%;">
          <span>▶</span> Puxar para o Timer Pomodoro Agora
        </button>
        <button id="btn-adiar-amanha" class="snoopy-btn-action snoopy-btn-sm" style="text-align: left; justify-content: flex-start; width: 100%;">
          <span>📅</span> Adiar Prazo para Amanhã
        </button>
        <button id="btn-prio-alta" class="snoopy-btn-action snoopy-btn-sm" style="text-align: left; justify-content: flex-start; width: 100%;">
          <span>⏫</span> Definir Prioridade Alta
        </button>
        <button id="btn-abrir-nota" class="snoopy-btn-action snoopy-btn-sm" style="text-align: left; justify-content: flex-start; width: 100%;">
          <span>📄</span> Abrir Nota de Origem
        </button>

        <div style="border-top: 1px solid rgba(255,255,255,0.07); margin-top: 4px; padding-top: 6px; display: flex; flex-direction: column; gap: 5px;">
          <button id="btn-excluir-tarefa" class="snoopy-btn-danger snoopy-btn-sm" style="text-align: left; justify-content: flex-start; width: 100%;">
            <span>❌</span> Excluir Apenas esta Tarefa
          </button>
          <button id="btn-excluir-nota" class="snoopy-btn-danger snoopy-btn-sm" style="text-align: left; justify-content: flex-start; width: 100%;">
            <span>🗑️</span> Excluir Nota de Origem do Vault
          </button>
        </div>
      </div>
    `;

    ModalFactory.abrir({
      htmlContent: modalHtml,
      maxWidth: '410px',
      onMontar: (box, fechar) => {
        box.querySelector('#modal-close-menu').onclick = fechar;

        box.querySelector('#btn-foco-pomo').onclick = () => {
          fechar();
          if (typeof window._snoopyDefinirTarefaFoco === 'function') {
            window._snoopyDefinirTarefaFoco({ texto: item.cleanText, path: filePath, line: t.line });
          }
        };

        box.querySelector('#btn-adiar-amanha').onclick = async () => {
          const amanhãFormatado = DateUtils.formatarDDMMYYYY(DateUtils.somarDias(todayStr, 1));
          const file = app.vault.getAbstractFileByPath(filePath);
          if (file) {
            await VaultStore.substituirLinha(app, file, l => l.includes(t.text), l => {
              return REGEX_DATA_TASKS.test(l) 
                ? l.replace(REGEX_DATA_TASKS, `📅 ${amanhãFormatado}`) 
                : `${l} 📅 ${amanhãFormatado}`;
            });
            new Notice(`Prazo adiado para ${amanhãFormatado}!`);
            fechar();
            if (typeof onAtualizar === 'function') await onAtualizar();
          }
        };

        box.querySelector('#btn-prio-alta').onclick = async () => {
          const file = app.vault.getAbstractFileByPath(filePath);
          if (file) {
            await VaultStore.substituirLinha(app, file, l => l.includes(t.text), l => `${l.replace(REGEX_PRIO_CHARS, '').trim()} ⏫`);
            new Notice('Prioridade alterada para Alta (⏫)!');
            fechar();
            if (typeof onAtualizar === 'function') await onAtualizar();
          }
        };

        box.querySelector('#btn-abrir-nota').onclick = () => {
          fechar();
          if (filePath) app.workspace.openLinkText(filePath, '', false);
        };

        box.querySelector('#btn-excluir-tarefa').onclick = async () => {
          const file = app.vault.getAbstractFileByPath(filePath);
          if (file) {
            await VaultStore.removerLinha(app, file, l => l.includes(t.text));
            new Notice('❌ Tarefa excluída!');
            fechar();
            if (typeof onAtualizar === 'function') await onAtualizar();
          }
        };

        box.querySelector('#btn-excluir-nota').onclick = async () => {
          await VaultStore.excluirArquivo(app, filePath);
          new Notice(`🗑️ Nota excluída do Vault!`);
          fechar();
          if (typeof onAtualizar === 'function') await onAtualizar();
        };
      }
    });
  },

  /**
   * Abre o popup para inserir tarefa a partir de templates conectados
   * (Estudos, Bookshelf, Kanban, Pomodoro) e gerenciar novos templates.
   */
  async abrirModalTemplateTarefa({ app, ctx, todayStr, garantirNotaDiaria, onAtualizar }) {
    let TaskTemplates = ctx.TaskTemplates;
    if (!TaskTemplates && ctx.ModuleLoader) {
      TaskTemplates = await ctx.ModuleLoader.carregar(app, "99_Meta/Snoopy/core/task_templates.js");
    }
    if (!TaskTemplates) {
      new Notice('Módulo de templates não encontrado.');
      return;
    }

    let templates = await TaskTemplates.listarTemplates(app);
    let templateSelecionadoId = templates.length > 0 ? templates[0].id : '';

    const renderizarTemplatesCards = (container) => {
      container.innerHTML = '';
      templates.forEach(tpl => {
        const isSel = tpl.id === templateSelecionadoId;
        const card = container.createEl('div', {
          cls: `snoopy-tpl-card ${isSel ? 'active' : ''}`,
          attr: {
            style: `cursor: pointer; padding: 10px 12px; border-radius: 8px; border: 1px solid ${isSel ? 'var(--interactive-accent, #60a5fa)' : 'rgba(255,255,255,0.08)'}; background: ${isSel ? 'rgba(96, 165, 250, 0.12)' : 'rgba(255,255,255,0.03)'}; display: flex; flex-direction: column; gap: 6px; transition: all 0.15s ease;`
          }
        });

        const topo = card.createEl('div', { attr: { style: 'display: flex; justify-content: space-between; align-items: center;' } });
        topo.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">${tpl.tipo === 'estudo' ? '📚' : tpl.tipo === 'leitura' ? '📖' : '🎯'}</span>
            <span style="font-size: 13px; font-weight: 700; color: #ffffff;">${tpl.nome}</span>
          </div>
          <span class="snoopy-meta" style="font-size: 10px; text-transform: uppercase; background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px;">${tpl.tipo}</span>
        `;

        const badges = card.createEl('div', { attr: { style: 'display: flex; flex-wrap: wrap; gap: 4px; margin-top: 2px;' } });
        if (tpl.vinculos?.estudos?.adicionar_ao_ciclo) {
          badges.innerHTML += '<span class="snoopy-meta" style="font-size: 9.5px; color: #86efac; background: rgba(134,239,172,0.1); padding: 1px 5px; border-radius: 3px;">📚 Ciclo Estudos</span>';
        }
        if (tpl.vinculos?.bookshelf?.vincular_leitura) {
          badges.innerHTML += '<span class="snoopy-meta" style="font-size: 9.5px; color: #fbcfe8; background: rgba(244,114,182,0.1); padding: 1px 5px; border-radius: 3px;">📖 Bookshelf</span>';
        }
        if (tpl.vinculos?.kanban) {
          badges.innerHTML += `<span class="snoopy-meta" style="font-size: 9.5px; color: #93c5fd; background: rgba(147,197,253,0.1); padding: 1px 5px; border-radius: 3px;">📋 Kanban: ${tpl.vinculos.kanban.status || 'Ativo'}</span>`;
        }
        if (tpl.vinculos?.pomodoro?.tempo_foco) {
          badges.innerHTML += `<span class="snoopy-meta" style="font-size: 9.5px; color: #fde047; background: rgba(253,224,71,0.1); padding: 1px 5px; border-radius: 3px;">⏱️ Pomodoro ${tpl.vinculos.pomodoro.tempo_foco}m</span>`;
        }

        card.onclick = () => {
          templateSelecionadoId = tpl.id;
          renderizarTemplatesCards(container);
        };
      });
    };

    if (ctx.ModalFactory) {
      ctx.ModalFactory.abrir({
        maxWidth: '520px',
        htmlContent: `
          <div class="snoopy-card-header">
            <span class="snoopy-section-title">⚡ Inserir a partir de Template</span>
            <button class="snoopy-modal-close" title="Fechar">✕</button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span class="snoopy-modal-label">1. Escolha o Template:</span>
                <button id="btn-toggle-novo-tpl" class="snoopy-btn-action snoopy-btn-sm" style="font-size: 11px; padding: 2px 8px;">
                  + Criar Novo Template
                </button>
              </div>
              <div id="container-tpl-cards" style="display: flex; flex-direction: column; gap: 6px; max-height: 220px; overflow-y: auto; padding-right: 2px;"></div>
            </div>

            <!-- Formulário Recolhível para Criar Novo Template -->
            <div id="form-novo-template" style="display: none; background: #14141c; border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 12px; flex-direction: column; gap: 8px;">
              <div style="font-weight: 700; font-size: 12px; color: #60a5fa;">➕ Criar Template Customizado</div>
              <input id="novo-tpl-nome" type="text" placeholder="Nome (Ex: Estudo de Francês, Leitura de Ficção...)" class="snoopy-form-input" style="width: 100%;">
              <div style="display: flex; gap: 8px;">
                <select id="novo-tpl-tipo" class="snoopy-form-input" style="flex: 1;">
                  <option value="estudo">Estudo (03_Estudos)</option>
                  <option value="leitura">Livro / Leitura (04_Leituras/Livros)</option>
                  <option value="projeto">Projeto (02_Projetos)</option>
                </select>
                <input id="novo-tpl-pomo" type="number" value="25" min="5" max="90" placeholder="Min Foco" class="snoopy-form-input" style="width: 80px;" title="Tempo de Foco Pomodoro">
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 10px; font-size: 11px; color: #a1a1aa; padding: 4px 0;">
                <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;">
                  <input id="chk-ciclo" type="checkbox" checked> Adicionar ao Ciclo de Estudos
                </label>
                <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;">
                  <input id="chk-kanban" type="checkbox" checked> Conectar ao Kanban
                </label>
              </div>
              <div style="display: flex; justify-content: flex-end; gap: 6px;">
                <button id="btn-cancelar-novo-tpl" class="snoopy-btn-action snoopy-btn-sm">Cancelar</button>
                <button id="btn-salvar-novo-tpl" class="snoopy-btn-primary snoopy-btn-sm">Salvar Template</button>
              </div>
            </div>

            <div>
              <div class="snoopy-modal-label" style="margin-bottom: 4px;">2. Título da Tarefa / Nota:</div>
              <input id="modal-tpl-title" type="text" placeholder="Ex: Senhor dos Anéis, Listening Podcast BBC..." class="snoopy-form-input" style="width: 100%; font-size: 12.5px;">
            </div>

            <div>
              <div class="snoopy-modal-label" style="margin-bottom: 4px;">3. Data de Execução:</div>
              <input id="modal-tpl-date" type="date" value="${todayStr}" class="snoopy-form-input" style="width: 100%;">
            </div>

            <div class="snoopy-toolbar" style="justify-content: flex-end; margin-top: 8px;">
              <button class="snoopy-btn-action snoopy-modal-close snoopy-btn-sm">Cancelar</button>
              <button id="btn-confirmar-tpl" class="snoopy-btn-primary snoopy-btn-sm" style="font-weight: 700;">
                Inserir & Focar Agora 🎯
              </button>
            </div>
          </div>
        `,
        onMontar: (box) => {
          const cardsBox = box.querySelector('#container-tpl-cards');
          const titleInput = box.querySelector('#modal-tpl-title');
          const btnToggle = box.querySelector('#btn-toggle-novo-tpl');
          const formNovo = box.querySelector('#form-novo-template');
          const btnCancelarNovo = box.querySelector('#btn-cancelar-novo-tpl');
          const btnSalvarNovo = box.querySelector('#btn-salvar-novo-tpl');

          if (cardsBox) renderizarTemplatesCards(cardsBox);
          if (titleInput) setTimeout(() => titleInput.focus(), 60);

          // Alternador de criação de template
          if (btnToggle && formNovo) {
            btnToggle.onclick = () => {
              const estaVisivel = formNovo.style.display === 'flex';
              formNovo.style.display = estaVisivel ? 'none' : 'flex';
            };
          }
          if (btnCancelarNovo && formNovo) {
            btnCancelarNovo.onclick = () => { formNovo.style.display = 'none'; };
          }

          // Salvar novo template JSON
          if (btnSalvarNovo) {
            btnSalvarNovo.onclick = async () => {
              const nome = box.querySelector('#novo-tpl-nome')?.value?.trim();
              const tipo = box.querySelector('#novo-tpl-tipo')?.value || 'estudo';
              const pomoMin = Number(box.querySelector('#novo-tpl-pomo')?.value) || 25;
              const chkCiclo = box.querySelector('#chk-ciclo')?.checked;
              const chkKanban = box.querySelector('#chk-kanban')?.checked;

              if (!nome) {
                new Notice('Informe o nome do novo template.');
                return;
              }

              const pasta = tipo === 'estudo' ? '03_Estudos' : tipo === 'leitura' ? '04_Leituras/Livros' : '02_Projetos';
              const novoTemplate = {
                nome,
                tipo,
                pasta,
                frontmatter: {
                  status: 'Em Andamento',
                  priority: 'Média',
                  tags: [tipo]
                },
                corpo: `# {{title}}\n\n> **Status:** \`Em Andamento\` | **Data:** {{date}}\n\n---\n\n## 🎯 Metas & Anotações\n- [ ] Atividade inicial\n\n[[00_Home/Home|← Voltar ao Painel]]\n`,
                vinculos: {
                  kanban: chkKanban ? { status: 'Em Andamento', prioridade: 'Média' } : null,
                  estudos: (tipo === 'estudo' && chkCiclo) ? { adicionar_ao_ciclo: true, revisao_espacada: true } : null,
                  bookshelf: tipo === 'leitura' ? { vincular_leitura: true } : null,
                  pomodoro: { tempo_foco: pomoMin, tempo_pausa: 5, auto_apontar: true }
                }
              };

              try {
                await TaskTemplates.salvarTemplate(app, novoTemplate);
                templates = await TaskTemplates.listarTemplates(app);
                templateSelecionadoId = novoTemplate.id;
                renderizarTemplatesCards(cardsBox);
                formNovo.style.display = 'none';
                new Notice(`✨ Template "${nome}" criado com sucesso!`);
              } catch(e) {
                new Notice(`Erro ao criar template: ${e.message}`);
              }
            };
          }
        },
        onConfirmar: async (box, fechar) => {
          const titleInput = box.querySelector('#modal-tpl-title');
          const dateInput = box.querySelector('#modal-tpl-date');
          const titulo = titleInput?.value?.trim();
          const dataEscolhida = dateInput?.value || todayStr;

          if (!titulo) {
            new Notice('Informe o título da nota / tarefa.');
            return;
          }

          const template = templates.find(t => t.id === templateSelecionadoId) || templates[0];
          if (!template) {
            new Notice('Nenhum template selecionado.');
            return;
          }

          try {
            // Executa criação da nota e conexão de vínculos (Estudos, Pomodoro, Bookshelf)
            const res = await TaskTemplates.executarCriacao(app, template, {
              title: titulo,
              titulo,
              date: dataEscolhida
            }, ctx.events);

            // Adiciona a tarefa na Nota Diária
            if (typeof garantirNotaDiaria === 'function' && ctx.VaultStore) {
              const dailyFile = await garantirNotaDiaria();
              if (dailyFile) {
                await ctx.VaultStore.adicionarLinhaEmSecao(app, dailyFile, 'Tarefas', res.tarefaTexto);
              }
            }

            fechar();
            new Notice(`🎯 Tarefa criada: "${titulo}" conectada aos módulos!`);
            
            // Abre a nota recém-criada
            if (res.notaPath) {
              await app.workspace.openLinkText(res.notaPath, '', false);
            }

            if (typeof onAtualizar === 'function') {
              await onAtualizar();
            }
          } catch(err) {
            console.error('[Snoopy] Erro ao instanciar template:', err);
            new Notice(`Erro ao instanciar template: ${err.message}`);
          }
        }
      });
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TarefasModal;
}

return TarefasModal;


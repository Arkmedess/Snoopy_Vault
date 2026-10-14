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
   * Helper para carregar projetos, estudos e leituras do Vault para vinculação.
   */
  _obterIniciativas(dv) {
    let iniciativas = [];
    if (!dv || typeof dv.pages !== 'function') return iniciativas;
    try {
      const pages = dv.pages('"02_Projetos" or "03_Estudos" or "04_Leituras"')
        .where(p => p.file && !p.file.path.includes('Template') && !p.file.path.includes('Painel') && !p.file.path.includes('00_Home') && !p.file.name.includes('Índice'));
      pages.forEach(p => {
        const isEstudo = p.file.path.startsWith('03_Estudos');
        const isLivro = p.file.path.startsWith('04_Leituras');
        const tipo = isLivro ? 'Livro' : (isEstudo ? 'Estudo' : 'Projeto');
        iniciativas.push({
          nome: p.title || p.file.name,
          path: p.file.path,
          tipo
        });
      });
      iniciativas.sort((a, b) => a.tipo.localeCompare(b.tipo) || a.nome.localeCompare(b.nome));
    } catch(e) {}
    return iniciativas;
  },

  /**
   * Abre o diálogo modal para criação de uma nova tarefa com metadados.
   */
  abrirModalNovaTarefa({ app, ctx, dv, todayStr, DateUtils, VaultStore, ModalFactory, garantirNotaDiaria, onAtualizar }) {
    const iniciativas = this._obterIniciativas(dv || ctx?.dv);

    const amanhãStr = DateUtils.somarDias(todayStr, 1);
    const semanaStr = DateUtils.somarDias(todayStr, 7);
    let periodoSelecionado = '';

    const renderIcon = (c, name, opts) => {
      if (ctx && typeof ctx.renderIcon === 'function') return ctx.renderIcon(c, name, opts);
      if (ctx && ctx.UIKit && typeof ctx.UIKit.renderIcon === 'function') return ctx.UIKit.renderIcon(c, name, opts);
      return null;
    };

    const modalHtml = `
      <div class="snoopy-card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.08);">
        <span class="snoopy-section-title" style="font-size: 14px; font-weight: 700;">+ Nova Tarefa</span>
        <button id="modal-close-task" class="snoopy-modal-close" title="Fechar"></button>
      </div>

      <div style="display: flex; flex-direction: column; gap: 10px;">
        <div>
          <div class="snoopy-modal-label" style="margin-bottom: 4px; font-size: 12.5px;">1. O que precisa ser feito?</div>
          <input id="modal-task-text" type="text" placeholder="Ex: Resolver 15 exercícios de SQL..." style="width: 100%; background: #14141c; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 7px 9px; color: #ffffff; font-size: 13px; outline: none;">
        </div>

        <div>
          <div class="snoopy-modal-label" style="margin-bottom: 5px; font-size: 12.5px;">2. Prazo:</div>
          <div id="modal-prazos" style="display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 6px;">
            <button type="button" class="chip-pr" data-prazo="${todayStr}" style="background: var(--interactive-accent, #60a5fa); color: #000; font-weight: bold; border: 1px solid rgba(255,255,255,0.12); border-radius: 4px; padding: 4px 8px; font-size: 11.5px; cursor: pointer;">Hoje (${DateUtils.formatarDDMMYYYY(todayStr)})</button>
            <button type="button" class="chip-pr" data-prazo="${amanhãStr}" style="background: rgba(255,255,255,0.04); color: #e4e4e7; border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; padding: 4px 8px; font-size: 11.5px; cursor: pointer;">Amanhã (${DateUtils.formatarDDMMYYYY(amanhãStr)})</button>
            <button type="button" class="chip-pr" data-prazo="${semanaStr}" style="background: rgba(255,255,255,0.04); color: #e4e4e7; border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; padding: 4px 8px; font-size: 11.5px; cursor: pointer;">Esta Semana (${DateUtils.formatarDDMMYYYY(semanaStr)})</button>
            <button type="button" class="chip-pr" data-prazo="" style="background: rgba(255,255,255,0.04); color: #e4e4e7; border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; padding: 4px 8px; font-size: 11.5px; cursor: pointer;">Sem Prazo</button>
          </div>
          <input id="modal-task-date" type="date" value="${todayStr}" style="width: 100%; background: #14141c; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 7px 9px; color: #ffffff; font-size: 12.5px; outline: none;">
        </div>

        <div>
          <div class="snoopy-modal-label" style="margin-bottom: 5px; font-size: 12.5px;">3. Período do Dia:</div>
          <div id="modal-periodos" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px;">
            <button type="button" class="chip-pe" data-val="🌅 Manhã" style="background: rgba(255,255,255,0.04); color: #a1a1aa; border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; padding: 5px 4px; font-size: 11.5px; font-weight: 600; cursor: pointer;">Manhã</button>
            <button type="button" class="chip-pe" data-val="☀️ Tarde" style="background: rgba(255,255,255,0.04); color: #a1a1aa; border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; padding: 5px 4px; font-size: 11.5px; font-weight: 600; cursor: pointer;">Tarde</button>
            <button type="button" class="chip-pe" data-val="🌙 Noite" style="background: rgba(255,255,255,0.04); color: #a1a1aa; border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; padding: 5px 4px; font-size: 11.5px; font-weight: 600; cursor: pointer;">Noite</button>
            <button type="button" class="chip-pe active" data-val="" style="background: rgba(255,255,255,0.14); color: #ffffff; border: 1px solid rgba(255,255,255,0.22); border-radius: 4px; padding: 5px 4px; font-size: 11.5px; font-weight: 600; cursor: pointer;">Livre</button>
          </div>
        </div>

        <div style="display: flex; gap: 8px;">
          <div style="flex: 1.2;">
            <div class="snoopy-modal-label" style="margin-bottom: 4px; font-size: 12.5px;">4. Meta Quantitativa (Opcional):</div>
            <div style="display: flex; gap: 4px;">
              <input id="modal-task-meta-val" type="number" min="1" placeholder="Ex: 30" style="width: 55%; background: #14141c; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 7px 9px; color: #ffffff; font-size: 12.5px; outline: none;">
              <select id="modal-task-meta-unit" style="width: 45%; background: #14141c; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 7px 9px; color: #ffffff; font-size: 12.5px; outline: none;">
                <option value="min">min</option>
                <option value="págs">págs</option>
                <option value="x">x</option>
                <option value="questões">questões</option>
                <option value="h">h</option>
                <option value="caps">caps</option>
              </select>
            </div>
          </div>
          <div style="flex: 0.8;">
            <div class="snoopy-modal-label" style="margin-bottom: 4px; font-size: 12.5px;">Já Feito (Opcional):</div>
            <input id="modal-task-meta-done" type="number" min="0" placeholder="Ex: 0" style="width: 100%; background: #14141c; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 7px 9px; color: #ffffff; font-size: 12.5px; outline: none;">
          </div>
        </div>

        <div style="display: flex; gap: 8px;">
          <div style="flex: 1;">
            <div class="snoopy-modal-label" style="margin-bottom: 4px; font-size: 12.5px;">5. Prioridade:</div>
            <select id="modal-task-prio" style="width: 100%; background: #14141c; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 7px 9px; color: #ffffff; font-size: 12.5px; outline: none;">
              <option value="⏫">Alta (⏫)</option>
              <option value="🔼" selected>Média (🔼)</option>
              <option value="🔽">Baixa (🔽)</option>
              <option value="">Normal</option>
            </select>
          </div>
          <div style="flex: 1;">
            <div class="snoopy-modal-label" style="margin-bottom: 4px; font-size: 12.5px;">6. Meta Pomodoros:</div>
            <select id="modal-task-pomos" style="width: 100%; background: #14141c; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 7px 9px; color: #ffffff; font-size: 12.5px; outline: none;">
              <option value="" selected>Sem meta</option>
              <option value="1">1 Pomodoro (25m)</option>
              <option value="2">2 Pomodoros (50m)</option>
              <option value="3">3 Pomodoros (1h15)</option>
            </select>
          </div>
        </div>

        <div>
          <div class="snoopy-modal-label" style="margin-bottom: 4px; font-size: 12.5px;">7. Vínculo:</div>
          <select id="modal-task-target" style="width: 100%; background: #14141c; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 7px 9px; color: #ffffff; font-size: 12.5px; outline: none;">
            <option value="daily" selected>Diário de Hoje (${DateUtils.formatarDDMMYYYY(todayStr)})</option>
            ${iniciativas.map(ini => `<option value="${ini.path}">[${ini.tipo}] ${ini.nome}</option>`).join('')}
          </select>
        </div>

        <div class="snoopy-toolbar" style="justify-content: flex-end; margin-top: 6px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.08);">
          <button id="modal-cancel-task" class="snoopy-btn-action snoopy-btn-sm">Cancelar</button>
          <button id="modal-save-task" class="snoopy-btn-primary snoopy-btn-sm" style="font-weight: 700;">Criar Tarefa</button>
        </div>
      </div>
    `;

    ModalFactory.abrir({
      htmlContent: modalHtml,
      maxWidth: '475px',
      onMontar: (box, fechar) => {
        const closeBtn = box.querySelector('#modal-close-task');
        if (closeBtn) {
          closeBtn.onclick = fechar;
          renderIcon(closeBtn, 'x', { size: 15 });
        }
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
          const metaVal = box.querySelector('#modal-task-meta-val')?.value?.trim();
          const metaUnit = box.querySelector('#modal-task-meta-unit')?.value || 'min';
          const metaDone = box.querySelector('#modal-task-meta-done')?.value?.trim();

          if (!texto) {
            new Notice('Informe a descrição da tarefa.');
            return;
          }

          let taskLine = `- [ ] ${texto}`;
          if (metaVal) {
            if (metaDone !== '' && metaDone !== undefined && metaDone !== null) {
              taskLine += ` [${metaDone}/${metaVal} ${metaUnit}]`;
            } else {
              taskLine += ` [${metaVal}${metaUnit}]`;
            }
          }
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
  /**
   * Abre o editor contextual completo da tarefa com barra iconográfica superior direita
   * para economia de espaço e edição em tempo real de descrição e metadados.
   */
  abrirModalMenuTarefa({ item, t, filePath, app, ctx, todayStr, DateUtils, VaultStore, ModalFactory, onAtualizar }) {
    const isDaily = !filePath || filePath.startsWith('01_Inbox/Diário') || filePath.includes('Diário');
    const iniciativas = this._obterIniciativas(ctx?.dv);
    const renderIcon = (c, name, opts) => {
      if (ctx && typeof ctx.renderIcon === 'function') return ctx.renderIcon(c, name, opts);
      if (ctx && ctx.UIKit && typeof ctx.UIKit.renderIcon === 'function') return ctx.UIKit.renderIcon(c, name, opts);
      return null;
    };

    const modalHtml = `
      <div class="snoopy-card-header" style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.08);">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="snoopy-section-title" style="font-size: 14px; font-weight: 700; letter-spacing: 0.5px;">EDITAR TAREFA</span>
        </div>
        <div style="display: flex; align-items: center; gap: 5px;">
          <button id="btn-hdr-pomo" class="snoopy-btn-icon" title="Puxar para o Timer Pomodoro"></button>
          <button id="btn-hdr-adiar" class="snoopy-btn-icon" title="Adiar prazo para amanhã (+1 dia)"></button>
          <button id="btn-hdr-abrir" class="snoopy-btn-icon" title="Abrir Nota de Origem"></button>
          <button id="btn-hdr-del-tarefa" class="snoopy-btn-icon" title="Excluir Tarefa" style="color: #f87171;"></button>
          ${!isDaily ? '<button id="btn-hdr-del-nota" class="snoopy-btn-icon" title="Excluir Nota do Vault" style="color: #ef4444;"></button>' : ''}
          <div style="width: 1px; height: 18px; background: rgba(255,255,255,0.14); margin: 0 3px;"></div>
          <button id="modal-close-menu" class="snoopy-modal-close" title="Fechar"></button>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 10px;">
        <div>
          <label class="snoopy-modal-label" style="display: block; margin-bottom: 4px; font-size: 12.5px;">Descrição da Tarefa:</label>
          <input id="modal-edit-text" type="text" class="snoopy-form-input" value="${(item.cleanText || '').replace(/"/g, '&quot;')}" style="width: 100%; font-size: 13.5px; padding: 8px 10px;">
        </div>

        <div style="display: flex; gap: 8px;">
          <div style="flex: 1.2;">
            <label class="snoopy-modal-label" style="display: block; margin-bottom: 4px; font-size: 12.5px;">Prazo de Execução:</label>
            <input id="modal-edit-date" type="date" value="${item.dueStr || ''}" class="snoopy-form-input" style="width: 100%; padding: 7px 9px; font-size: 12.5px;">
          </div>
          <div style="flex: 0.8;">
            <label class="snoopy-modal-label" style="display: block; margin-bottom: 4px; font-size: 12.5px;">Prioridade:</label>
            <select id="modal-edit-prio" class="snoopy-form-input" style="width: 100%; padding: 7px 9px; font-size: 12.5px;">
              <option value="" ${!item.prio ? 'selected' : ''}>Normal</option>
              <option value="alta" ${item.prio === 'alta' ? 'selected' : ''}>Alta (⏫)</option>
              <option value="media" ${item.prio === 'media' ? 'selected' : ''}>Média (🔼)</option>
              <option value="baixa" ${item.prio === 'baixa' ? 'selected' : ''}>Baixa (🔽)</option>
            </select>
          </div>
        </div>

        <div style="display: flex; gap: 8px;">
          <div style="flex: 1;">
            <label class="snoopy-modal-label" style="display: block; margin-bottom: 4px; font-size: 12.5px;">Período do Dia:</label>
            <select id="modal-edit-periodo" class="snoopy-form-input" style="width: 100%; padding: 7px 9px; font-size: 12.5px;">
              <option value="" ${!item.periodo ? 'selected' : ''}>Livre / Sem período</option>
              <option value="🌅 Manhã" ${item.periodo && /manh/i.test(item.periodo) ? 'selected' : ''}>Manhã</option>
              <option value="☀️ Tarde" ${item.periodo && /tard/i.test(item.periodo) ? 'selected' : ''}>Tarde</option>
              <option value="🌙 Noite" ${item.periodo && /noit/i.test(item.periodo) ? 'selected' : ''}>Noite</option>
            </select>
          </div>
          <div style="flex: 1;">
            <label class="snoopy-modal-label" style="display: block; margin-bottom: 4px; font-size: 12.5px;">Meta Pomodoro:</label>
            <select id="modal-edit-pomos" class="snoopy-form-input" style="width: 100%; padding: 7px 9px; font-size: 12.5px;">
              <option value="" ${!item.pomosEst ? 'selected' : ''}>Sem estimativa</option>
              <option value="1" ${item.pomosEst === 1 ? 'selected' : ''}>1 Pomodoro (25m)</option>
              <option value="2" ${item.pomosEst === 2 ? 'selected' : ''}>2 Pomodoros (50m)</option>
              <option value="3" ${item.pomosEst === 3 ? 'selected' : ''}>3 Pomodoros (1h15)</option>
              <option value="4" ${item.pomosEst === 4 ? 'selected' : ''}>4 Pomodoros (1h40)</option>
            </select>
          </div>
        </div>

        <div style="display: flex; gap: 8px;">
          <div style="flex: 1.2;">
            <label class="snoopy-modal-label" style="display: block; margin-bottom: 4px; font-size: 12.5px;">Meta Quantitativa:</label>
            <div style="display: flex; gap: 4px;">
              <input id="modal-edit-meta" type="number" min="1" placeholder="Ex: 30" value="${item.progresso?.meta || ''}" class="snoopy-form-input" style="width: 50%; padding: 7px 9px; font-size: 12.5px;">
              <select id="modal-edit-unit" class="snoopy-form-input" style="width: 50%; padding: 7px 9px; font-size: 12.5px;">
                <option value="min" ${item.progresso?.unidade === 'min' ? 'selected' : ''}>min</option>
                <option value="págs" ${item.progresso?.unidade === 'págs' ? 'selected' : ''}>págs</option>
                <option value="x" ${item.progresso?.unidade === 'x' ? 'selected' : ''}>x</option>
                <option value="questões" ${item.progresso?.unidade === 'questões' ? 'selected' : ''}>questões</option>
                <option value="h" ${item.progresso?.unidade === 'h' ? 'selected' : ''}>h</option>
                <option value="caps" ${item.progresso?.unidade === 'caps' ? 'selected' : ''}>caps</option>
              </select>
            </div>
          </div>
          <div style="flex: 0.8;">
            <label class="snoopy-modal-label" style="display: block; margin-bottom: 4px; font-size: 12.5px;">Já Feito:</label>
            <input id="modal-edit-done" type="number" min="0" placeholder="Ex: 0" value="${item.progresso?.feito !== null && item.progresso?.feito !== undefined ? item.progresso.feito : ''}" class="snoopy-form-input" style="width: 100%; padding: 7px 9px; font-size: 12.5px;">
          </div>
        </div>

        <div>
          <label class="snoopy-modal-label" style="display: block; margin-bottom: 4px; font-size: 12.5px;">Vínculo / Nota de Origem:</label>
          <select id="modal-edit-target" class="snoopy-form-input" style="width: 100%; padding: 7px 9px; font-size: 12.5px;">
            <option value="daily" ${isDaily ? 'selected' : ''}>Diário de Hoje (${DateUtils ? DateUtils.formatarDDMMYYYY(todayStr) : todayStr})</option>
            ${iniciativas.map(ini => `<option value="${ini.path}" ${filePath === ini.path ? 'selected' : ''}>[${ini.tipo}] ${ini.nome}</option>`).join('')}
          </select>
        </div>

        <div class="snoopy-toolbar" style="justify-content: flex-end; margin-top: 6px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.08);">
          <button id="modal-cancel-edit" class="snoopy-btn-action snoopy-btn-sm">Cancelar</button>
          <button id="modal-save-edit" class="snoopy-btn-primary snoopy-btn-sm" style="font-weight: 700;">Salvar Alterações</button>
        </div>
      </div>
    `;

    ModalFactory.abrir({
      htmlContent: modalHtml,
      maxWidth: '465px',
      onMontar: (box, fechar) => {
        const btnPomo = box.querySelector('#btn-hdr-pomo');
        const btnAdiar = box.querySelector('#btn-hdr-adiar');
        const btnAbrir = box.querySelector('#btn-hdr-abrir');
        const btnDelTarefa = box.querySelector('#btn-hdr-del-tarefa');
        const btnDelNota = box.querySelector('#btn-hdr-del-nota');
        const btnClose = box.querySelector('#modal-close-menu');
        const btnCancelar = box.querySelector('#modal-cancel-edit');
        const btnSalvar = box.querySelector('#modal-save-edit');
        const dateInput = box.querySelector('#modal-edit-date');

        if (btnPomo) renderIcon(btnPomo, 'play', { size: 15 });
        if (btnAdiar) renderIcon(btnAdiar, 'calendar-plus', { size: 15 });
        if (btnAbrir) renderIcon(btnAbrir, 'external-link', { size: 15 });
        if (btnDelTarefa) renderIcon(btnDelTarefa, 'trash-2', { size: 15, color: '#f87171' });
        if (btnDelNota) renderIcon(btnDelNota, 'file-x', { size: 15, color: '#ef4444' });
        if (btnClose) renderIcon(btnClose, 'x', { size: 15 });

        if (btnClose) btnClose.onclick = fechar;
        if (btnCancelar) btnCancelar.onclick = fechar;

        if (btnPomo) {
          btnPomo.onclick = () => {
            fechar();
            if (typeof window.snoopySetPomodoroFocus === 'function') {
              window.snoopySetPomodoroFocus(item.cleanText);
            }
            if (typeof window._snoopyDefinirTarefaFoco === 'function') {
              window._snoopyDefinirTarefaFoco({ texto: item.cleanText, path: filePath, line: t.line });
            }
            new Notice('🎯 Foco direcionado ao Cockpit Pomodoro!');
          };
        }

        if (btnAdiar) {
          btnAdiar.onclick = () => {
            const proxDia = DateUtils ? DateUtils.somarDias(todayStr, 1) : '';
            if (dateInput && proxDia) {
              dateInput.value = proxDia;
              new Notice('Prazo ajustado para amanhã. Clique em Salvar para confirmar.');
            }
          };
        }

        if (btnAbrir) {
          btnAbrir.onclick = () => {
            fechar();
            if (filePath) app.workspace.openLinkText(filePath, '', false);
          };
        }

        if (btnDelTarefa) {
          btnDelTarefa.onclick = async () => {
            const file = app.vault.getAbstractFileByPath(filePath);
            if (file) {
              await VaultStore.removerLinha(app, file, l => l.includes(t.text));
              new Notice('Tarefa excluída!');
              fechar();
              if (typeof onAtualizar === 'function') await onAtualizar();
            }
          };
        }

        if (btnDelNota) {
          btnDelNota.onclick = async () => {
            await VaultStore.excluirArquivo(app, filePath);
            new Notice('Nota de origem excluída do Vault!');
            fechar();
            if (typeof onAtualizar === 'function') await onAtualizar();
          };
        }

        if (btnSalvar) {
          btnSalvar.onclick = async () => {
            const novoTexto = box.querySelector('#modal-edit-text')?.value.trim();
            if (!novoTexto) {
              new Notice('A descrição da tarefa não pode estar vazia.');
              return;
            }
            const novaData = box.querySelector('#modal-edit-date')?.value;
            const novaPrio = box.querySelector('#modal-edit-prio')?.value;
            const novoPeriodo = box.querySelector('#modal-edit-periodo')?.value;
            const novosPomos = box.querySelector('#modal-edit-pomos')?.value;
            const metaVal = box.querySelector('#modal-edit-meta')?.value.trim();
            const metaUnit = box.querySelector('#modal-edit-unit')?.value;
            const metaDone = box.querySelector('#modal-edit-done')?.value.trim();
            const novoDestino = box.querySelector('#modal-edit-target')?.value || (isDaily ? 'daily' : filePath);

            let progStr = '';
            if (metaVal) {
              if (metaDone !== '' && metaDone !== null) {
                progStr = ` [${metaDone}/${metaVal} ${metaUnit}]`;
              } else {
                progStr = ` [${metaVal}${metaUnit}]`;
              }
            }

            let novaLinha = `- [ ] ${novoTexto}${progStr}`;
            if (novaData) {
              const dataFmt = (DateUtils && typeof DateUtils.formatarDDMMYYYY === 'function') 
                ? DateUtils.formatarDDMMYYYY(novaData) 
                : novaData;
              novaLinha += ` 📅 ${dataFmt}`;
            }
            if (novaPrio === 'alta') novaLinha += ' ⏫';
            else if (novaPrio === 'media') novaLinha += ' 🔼';
            else if (novaPrio === 'baixa') novaLinha += ' 🔽';

            if (novoPeriodo) novaLinha += ` ${novoPeriodo}`;
            if (novosPomos) novaLinha += ` 🍅 ${novosPomos}`;

            const destinoAtual = isDaily ? 'daily' : filePath;
            if (novoDestino !== destinoAtual) {
              // Move a tarefa de arquivo
              if (filePath) {
                const fileAntigo = app.vault.getAbstractFileByPath(filePath);
                if (fileAntigo) {
                  await VaultStore.removerLinha(app, fileAntigo, l => l.includes(t.text));
                }
              }
              if (novoDestino === 'daily') {
                const dailyFile = (typeof ctx?.garantirNotaDiaria === 'function')
                  ? await ctx.garantirNotaDiaria()
                  : (ctx?.dailyPath ? app.vault.getAbstractFileByPath(ctx.dailyPath) : null);
                if (dailyFile) {
                  await VaultStore.adicionarLinhaEmSecao(app, dailyFile, '🎯 Foco Principal de Hoje', novaLinha);
                }
              } else {
                const targetFile = app.vault.getAbstractFileByPath(novoDestino);
                if (targetFile) {
                  await VaultStore.adicionarLinhaEmSecao(app, targetFile, 'Tarefas', novaLinha);
                }
              }
              new Notice('Tarefa movida e atualizada com sucesso!');
            } else {
              const file = app.vault.getAbstractFileByPath(filePath);
              if (file) {
                await VaultStore.substituirLinha(app, file, l => l.includes(t.text), () => novaLinha);
                new Notice('Tarefa atualizada com sucesso!');
              }
            }
            fechar();
            if (typeof onAtualizar === 'function') await onAtualizar();
          };
        }
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

    const renderIcon = (c, name, opts) => {
      if (ctx && typeof ctx.renderIcon === 'function') return ctx.renderIcon(c, name, opts);
      if (ctx && ctx.UIKit && typeof ctx.UIKit.renderIcon === 'function') return ctx.UIKit.renderIcon(c, name, opts);
      return null;
    };

    const renderizarTemplatesCards = (container) => {
      container.innerHTML = '';
      templates.forEach(tpl => {
        const isSel = tpl.id === templateSelecionadoId;
        const iconName = tpl.tipo === 'estudo' ? 'book-open' : tpl.tipo === 'leitura' ? 'bookmark' : 'target';
        const iconColor = tpl.tipo === 'estudo' ? '#93c5fd' : tpl.tipo === 'leitura' ? '#f472b6' : '#c084fc';
        const card = container.createEl('div', {
          cls: `snoopy-tpl-card ${isSel ? 'active' : ''}`,
          attr: {
            style: `cursor: pointer; padding: 7px 10px; border-radius: 6px; border: 1px solid ${isSel ? 'var(--interactive-accent, #60a5fa)' : 'rgba(255,255,255,0.08)'}; background: ${isSel ? 'rgba(96, 165, 250, 0.12)' : 'rgba(255,255,255,0.03)'}; display: flex; align-items: center; justify-content: space-between; gap: 8px; transition: all 0.15s ease;`
          }
        });

        const esq = card.createEl('div', { attr: { style: 'display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;' } });
        const iconBox = esq.createEl('span', { attr: { style: 'display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 4px; background: rgba(255,255,255,0.06); flex-shrink: 0;' } });
        renderIcon(iconBox, iconName, { size: 13, color: iconColor });

        const infoBox = esq.createEl('div', { attr: { style: 'display: flex; flex-direction: column; min-width: 0; gap: 2px;' } });
        infoBox.createEl('span', {
          text: tpl.nome,
          attr: { style: 'font-size: 12px; font-weight: 600; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;' }
        });

        const badgesRow = infoBox.createEl('div', { attr: { style: 'display: flex; flex-wrap: wrap; gap: 4px; flex-shrink: 0;' } });
        if (tpl.vinculos?.estudos?.adicionar_ao_ciclo) {
          const bCiclo = badgesRow.createEl('span', {
            cls: 'snoopy-meta',
            attr: { style: 'font-size: 9px; color: #86efac; background: rgba(134,239,172,0.1); padding: 1px 4px; border-radius: 3px; display: inline-flex; align-items: center; gap: 3px;' }
          });
          renderIcon(bCiclo, 'refresh-cw', { size: 9, color: '#86efac' });
          bCiclo.createEl('span', { text: 'Ciclo' });
        }
        if (tpl.vinculos?.bookshelf?.vincular_leitura) {
          const bBook = badgesRow.createEl('span', {
            cls: 'snoopy-meta',
            attr: { style: 'font-size: 9px; color: #fbcfe8; background: rgba(244,114,182,0.1); padding: 1px 4px; border-radius: 3px; display: inline-flex; align-items: center; gap: 3px;' }
          });
          renderIcon(bBook, 'book', { size: 9, color: '#fbcfe8' });
          bBook.createEl('span', { text: 'Bookshelf' });
        }
        if (tpl.vinculos?.kanban) {
          const bKanban = badgesRow.createEl('span', {
            cls: 'snoopy-meta',
            attr: { style: 'font-size: 9px; color: #93c5fd; background: rgba(147,197,253,0.1); padding: 1px 4px; border-radius: 3px; display: inline-flex; align-items: center; gap: 3px;' }
          });
          renderIcon(bKanban, 'columns', { size: 9, color: '#93c5fd' });
          bKanban.createEl('span', { text: 'Kanban' });
        }
        if (tpl.vinculos?.pomodoro?.tempo_foco) {
          const bPomo = badgesRow.createEl('span', {
            cls: 'snoopy-meta',
            attr: { style: 'font-size: 9px; color: #fde047; background: rgba(253,224,71,0.1); padding: 1px 4px; border-radius: 3px; display: inline-flex; align-items: center; gap: 3px;' }
          });
          renderIcon(bPomo, 'clock', { size: 9, color: '#fde047' });
          bPomo.createEl('span', { text: `${tpl.vinculos.pomodoro.tempo_foco}m` });
        }

        const dir = card.createEl('div', { attr: { style: 'flex-shrink: 0;' } });
        dir.createEl('span', {
          cls: 'snoopy-meta',
          text: tpl.tipo.toUpperCase(),
          attr: { style: 'font-size: 9.5px; font-weight: 700; letter-spacing: 0.5px; background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; color: #a1a1aa;' }
        });

        card.onclick = () => {
          templateSelecionadoId = tpl.id;
          renderizarTemplatesCards(container);
        };
      });
    };

    if (ctx.ModalFactory) {
      ctx.ModalFactory.abrir({
        maxWidth: '540px',
        htmlContent: `
          <div class="snoopy-card-header" style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span class="snoopy-section-title" style="font-size: 13px; font-weight: 700;">INSERIR A PARTIR DE TEMPLATE</span>
            <button class="snoopy-modal-close" title="Fechar"></button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px; max-height: calc(85vh - 75px); overflow-y: auto; padding-right: 4px;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span class="snoopy-modal-label">1. Escolha o Template:</span>
                <button id="btn-toggle-novo-tpl" class="snoopy-btn-action snoopy-btn-sm" style="font-size: 11px; padding: 2px 8px;">
                  + Novo Template
                </button>
              </div>
              <div id="container-tpl-cards" style="display: flex; flex-direction: column; gap: 6px; max-height: 125px; overflow-y: auto; padding-right: 2px;"></div>
            </div>

            <!-- Formulário Recolhível para Criar Novo Template -->
            <div id="form-novo-template" style="display: none; background: #14141c; border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 12px; flex-direction: column; gap: 8px;">
              <div style="font-weight: 700; font-size: 11.5px; color: #60a5fa;">Criar Novo Template</div>
              <input id="novo-tpl-nome" type="text" placeholder="Nome (Ex: Leitura Técnica, Prática de Código...)" class="snoopy-form-input" style="width: 100%;">
              <div style="display: flex; gap: 8px;">
                <select id="novo-tpl-tipo" class="snoopy-form-input" style="flex: 1;">
                  <option value="estudo">Estudo (03_Estudos)</option>
                  <option value="leitura">Livro / Leitura (04_Leituras/Livros)</option>
                  <option value="projeto">Projeto (02_Projetos)</option>
                </select>
                <input id="novo-tpl-pomo" type="number" value="25" min="5" max="90" placeholder="Min Foco" class="snoopy-form-input" style="width: 80px;" title="Tempo de Foco Pomodoro (minutos)">
              </div>
              <div style="display: flex; gap: 8px;">
                <input id="novo-tpl-meta-val" type="number" min="1" placeholder="Meta padrão (Ex: 30)" class="snoopy-form-input" style="flex: 1;">
                <select id="novo-tpl-meta-unit" class="snoopy-form-input" style="width: 120px;">
                  <option value="min">minutos (min)</option>
                  <option value="págs">páginas (págs)</option>
                  <option value="x">vezes (x)</option>
                  <option value="questões">questões</option>
                  <option value="h">horas (h)</option>
                  <option value="caps">capítulos</option>
                </select>
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 10px; font-size: 11px; color: #a1a1aa; padding: 2px 0;">
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
              <input id="modal-tpl-title" type="text" placeholder="Ex: Hábitos Atômicos Cap. 3, Exercícios de Grafos..." class="snoopy-form-input" style="width: 100%; font-size: 12.5px;">
            </div>

            <div style="display: flex; gap: 8px;">
              <div style="flex: 1.2;">
                <div class="snoopy-modal-label" style="margin-bottom: 4px;">3. Meta & Unidade (Opcional):</div>
                <div style="display: flex; gap: 4px;">
                  <input id="modal-tpl-meta-val" type="number" min="1" placeholder="Qtd (Ex: 30)" class="snoopy-form-input" style="width: 50%;">
                  <select id="modal-tpl-meta-unit" class="snoopy-form-input" style="width: 50%;">
                    <option value="min">min</option>
                    <option value="págs">págs</option>
                    <option value="x">x</option>
                    <option value="questões">questões</option>
                    <option value="h">h</option>
                    <option value="caps">caps</option>
                  </select>
                </div>
              </div>
              <div style="flex: 0.8;">
                <div class="snoopy-modal-label" style="margin-bottom: 4px;">Já Feito (Opcional):</div>
                <input id="modal-tpl-meta-done" type="number" min="0" placeholder="Ex: 0" class="snoopy-form-input" style="width: 100%;">
              </div>
            </div>

            <div>
              <div class="snoopy-modal-label" style="margin-bottom: 4px;">4. Data de Execução:</div>
              <input id="modal-tpl-date" type="date" value="${todayStr}" class="snoopy-form-input" style="width: 100%;">
            </div>

            <div class="snoopy-toolbar" style="justify-content: flex-end; margin-top: 4px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06);">
              <button class="snoopy-btn-action snoopy-modal-close snoopy-btn-sm">Cancelar</button>
              <button id="btn-confirmar-tpl" class="snoopy-btn-primary snoopy-btn-sm" style="font-weight: 700;">
                Inserir & Focar Agora
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
          const metaValIn = box.querySelector('#modal-tpl-meta-val');
          const metaUnitIn = box.querySelector('#modal-tpl-meta-unit');

          if (cardsBox) {
            renderizarTemplatesCards(cardsBox);
            // Ao trocar template, sugere valores padrão se configurados
            const observer = new MutationObserver(() => {
              const tpl = templates.find(t => t.id === templateSelecionadoId);
              if (tpl) {
                if (tpl.meta_qtd && metaValIn && !metaValIn.value) metaValIn.value = tpl.meta_qtd;
                if (tpl.unidade_medida && metaUnitIn) metaUnitIn.value = tpl.unidade_medida;
                else if (tpl.tipo === 'leitura' && metaUnitIn) metaUnitIn.value = 'págs';
                else if (tpl.tipo === 'estudo' && metaUnitIn) metaUnitIn.value = 'min';
              }
            });
            observer.observe(cardsBox, { childList: true, subtree: true });
          }

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
              const metaVal = Number(box.querySelector('#novo-tpl-meta-val')?.value) || null;
              const metaUnit = box.querySelector('#novo-tpl-meta-unit')?.value || 'min';
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
                meta_qtd: metaVal,
                unidade_medida: metaUnit,
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
                new Notice(`Template "${nome}" criado com sucesso!`);
              } catch(e) {
                new Notice(`Erro ao criar template: ${e.message}`);
              }
            };
          }

          box.querySelectorAll('.snoopy-modal-close').forEach(b => {
            b.onclick = fechar;
            if (!b.textContent.trim()) {
              renderIcon(b, 'x', { size: 15 });
            }
          });

          const btnConfirmar = box.querySelector('#btn-confirmar-tpl');
          if (btnConfirmar) {
            btnConfirmar.onclick = () => executarConfirmacao(box, fechar);
          }
        },
        onConfirmar: async (box, fechar) => {
          await executarConfirmacao(box, fechar);
        }
      });

      async function executarConfirmacao(box, fechar) {
        const titleInput = box.querySelector('#modal-tpl-title');
        const dateInput = box.querySelector('#modal-tpl-date');
        const metaValIn = box.querySelector('#modal-tpl-meta-val');
        const metaUnitIn = box.querySelector('#modal-tpl-meta-unit');
        const metaDoneIn = box.querySelector('#modal-tpl-meta-done');

        const titulo = titleInput?.value?.trim();
        const dataEscolhida = dateInput?.value || todayStr;
        const metaQtd = metaValIn?.value ? parseFloat(metaValIn.value) : undefined;
        const unidadeMedida = metaUnitIn?.value || 'min';
        const progFeito = metaDoneIn?.value ? parseFloat(metaDoneIn.value) : undefined;

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
            // Executa criação da nota e conexão de vínculos com metadados quantitativos
            const res = await TaskTemplates.executarCriacao(app, template, {
              title: titulo,
              titulo,
              date: dataEscolhida,
              meta_qtd: metaQtd,
              unidade_medida: unidadeMedida,
              progresso_feito: progFeito
            }, ctx.events);

            // Adiciona a tarefa na Nota Diária
            if (typeof garantirNotaDiaria === 'function' && ctx.VaultStore) {
              const dailyFile = await garantirNotaDiaria();
              if (dailyFile) {
                await ctx.VaultStore.adicionarLinhaEmSecao(app, dailyFile, 'Tarefas', res.tarefaTexto);
              }
            }

            fechar();
            new Notice(`Tarefa criada: "${titulo}" conectada aos módulos!`);
            
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
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TarefasModal;
}

return TarefasModal;


/**
 * Snoopy Vault - Submódulo: Componente e Modal de Hábitos Diários
 * Gerencia a renderização dos pills de hábitos, cálculo de porcentagem
 * e o modal de cadastro/edição/exclusão de hábitos na nota diária.
 *
 * @module modulos/daily_tracker/habitos_view
 */

const REGEX_HABIT_TASK = /^- \[([ xX])\] (.*)$/;

const HabitosView = {
  /**
   * Monta o painel de hábitos dentro do card designado.
   *
   * @param {object} params - Contexto e referências do DOM.
   * @param {HTMLElement} params.habitsCard - Contêiner do card de hábitos.
   * @param {object} params.ctx - Contexto geral (app, TaskParser, VaultStore, ModalFactory, etc.).
   * @returns {Promise<{ renderHabitos: Function }>}
   */
  async montar({ habitsCard, ctx }) {
    const { app, dailyPath, garantirNotaDiaria, TaskParser, VaultStore, ModalFactory } = ctx;

    const habitsTop = habitsCard.createEl('div', { attr: { style: 'display: flex; flex-direction: column; gap: 8px;' } });
    const habitsHeader = habitsTop.createEl('div', { cls: 'snoopy-card-header' });

    const mainTitleBox = habitsHeader.createEl('div', { cls: 'snoopy-card-header-main' });
    const linhaTitulo = mainTitleBox.createEl('div', { cls: 'snoopy-toolbar' });
    if (ctx && ctx.renderIcon) {
      ctx.renderIcon(linhaTitulo, 'repeat', { size: 16, color: 'var(--snoopy-muted, #a1a1aa)' });
    }
    linhaTitulo.createEl('span', { cls: 'snoopy-section-title', text: 'HÁBITOS' });
    mainTitleBox.createEl('span', { cls: 'snoopy-card-subtitle', text: 'Rituais diários e frequência' });

    const habitsHeaderRight = habitsHeader.createEl('div', { cls: 'snoopy-toolbar' });
    habitsHeaderRight.innerHTML = `
      <span id="snoopy-habit-pct" class="snoopy-micro" style="color: var(--snoopy-green-done); font-weight: bold;">0%</span>
    `;

    const habitsTrack = habitsTop.createEl('div', { cls: 'snoopy-prog-track', attr: { style: 'height: 3px; width: 100%; margin-bottom: 4px;' } });
    const habitsBar = habitsTrack.createEl('div', { cls: 'snoopy-prog-fill', attr: { style: 'width: 0%; background: var(--snoopy-green-done);' } });

    const habitsPillsBox = habitsCard.createEl('div', { 
      cls: 'snoopy-habits-scroll',
      attr: { style: 'display: flex; flex-direction: column; gap: 5px; max-height: 250px; overflow-y: auto; padding-right: 4px;' } 
    });

    const renderIcon = (c, name, opts) => {
      if (ctx && typeof ctx.renderIcon === 'function') return ctx.renderIcon(c, name, opts);
      if (ctx && ctx.UIKit && typeof ctx.UIKit.renderIcon === 'function') return ctx.UIKit.renderIcon(c, name, opts);
      return null;
    };

    const habitsFooter = habitsCard.createEl('div', { 
      cls: 'snoopy-micro',
      attr: { style: 'display: flex; justify-content: space-between; align-items: center; color: #71717a; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.06);' } 
    });
    habitsFooter.innerHTML = `
      <span id="snoopy-open-daily-link" class="snoopy-meta" style="cursor: pointer;" title="Abrir nota diária de hoje">01_Inbox/Diário</span>
      <button id="snoopy-manage-habits-btn" class="snoopy-btn-action snoopy-btn-sm" title="Cadastrar ou Modificar Hábitos" style="display: inline-flex; align-items: center; gap: 4px;"></button>
    `;

    const manageBtn = habitsFooter.querySelector('#snoopy-manage-habits-btn');
    if (manageBtn) {
      renderIcon(manageBtn, 'settings', { size: 11 });
      manageBtn.createEl('span', { text: 'GERENCIAR' });
      manageBtn.onclick = () => abrirModalGerenciarHabitos();
    }

    const dailyLink = habitsFooter.querySelector('#snoopy-open-daily-link');
    if (dailyLink) {
      dailyLink.addEventListener('click', async () => {
        const dailyFile = await garantirNotaDiaria();
        if (dailyFile) app.workspace.openLinkText(dailyFile.path, '', false);
      });
    }

    // Modal Unificado de Gestão de Hábitos
    function abrirModalGerenciarHabitos(habitoParaEditar = null) {
      let periodoSelecionado = 'qualquer';
      let diasSelecionados = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
      let escopoSelecionado = 'persistente';

      if (habitoParaEditar) {
        const raw = habitoParaEditar.rawText || '';
        if (raw.includes('🌅') || /manh[ãa]/i.test(raw)) periodoSelecionado = 'manha';
        else if (raw.includes('☀️') || /tarde/i.test(raw)) periodoSelecionado = 'tarde';
        else if (raw.includes('🌙') || /noite/i.test(raw)) periodoSelecionado = 'noite';

        if (raw.includes('🔁 Todos os dias')) diasSelecionados = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        else if (raw.includes('🔁 Fins de semana')) diasSelecionados = ['Dom', 'Sáb'];
        else if (raw.includes('🔁')) {
          const m = raw.match(/🔁\s*([A-Za-zÀ-ÿ,\- ]+)/);
          if (m) {
            diasSelecionados = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].filter(d => m[1].includes(d));
            if (diasSelecionados.length === 0) diasSelecionados = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
          }
        }
      }

      const modalHtml = `
        <div class="snoopy-card-header" style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span class="snoopy-section-title" style="font-size: 13px; font-weight: 700;">${habitoParaEditar ? 'MODIFICAR HÁBITO' : 'GESTÃO DE HÁBITOS'}</span>
          <button id="modal-close-btn" class="snoopy-modal-close" title="Fechar"></button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 11px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 12px;">
          <div>
            <div class="snoopy-modal-label" style="margin-bottom: 4px;">Nome da atividade de disciplina:</div>
            <input id="modal-habit-input" type="text" placeholder="Ex: Leitura 20 min, Meditação..." value="${habitoParaEditar ? (habitoParaEditar.cleanName || '').replace(/"/g, '&quot;') : ''}" class="snoopy-form-input" style="width: 100%; font-size: 12px; padding: 8px;">
          </div>

          <div>
            <div class="snoopy-modal-label" style="margin-bottom: 5px;">Período do Dia:</div>
            <div id="habit-periodos" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px;">
              <button type="button" class="chip-h-p" data-val="manha" style="background: rgba(255,255,255,0.04); color: #a1a1aa; border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; padding: 4px; font-size: 10.5px; cursor: pointer;">Manhã</button>
              <button type="button" class="chip-h-p" data-val="tarde" style="background: rgba(255,255,255,0.04); color: #a1a1aa; border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; padding: 4px; font-size: 10.5px; cursor: pointer;">Tarde</button>
              <button type="button" class="chip-h-p" data-val="noite" style="background: rgba(255,255,255,0.04); color: #a1a1aa; border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; padding: 4px; font-size: 10.5px; cursor: pointer;">Noite</button>
              <button type="button" class="chip-h-p active" data-val="qualquer" style="background: rgba(255,255,255,0.12); color: #ffffff; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; padding: 4px; font-size: 10.5px; cursor: pointer;">Livre</button>
            </div>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
              <span class="snoopy-modal-label">Frequência & Dias:</span>
              <div style="display: flex; gap: 4px;">
                <button type="button" id="btn-pre-todos" style="background: none; border: none; font-size: 10px; color: #60a5fa; cursor: pointer; text-decoration: underline;">Todos</button>
                <button type="button" id="btn-pre-uteis" style="background: none; border: none; font-size: 10px; color: #60a5fa; cursor: pointer; text-decoration: underline;">Seg-Sex</button>
                <button type="button" id="btn-pre-fds" style="background: none; border: none; font-size: 10px; color: #60a5fa; cursor: pointer; text-decoration: underline;">FDS</button>
              </div>
            </div>
            <div id="habit-dias" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;">
              ${['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => `
                <button type="button" class="chip-h-d" data-dia="${dia}" style="background: ${diasSelecionados.includes(dia) ? 'rgba(134,239,172,0.12)' : 'rgba(255,255,255,0.03)'}; color: ${diasSelecionados.includes(dia) ? '#86efac' : '#71717a'}; border: 1px solid ${diasSelecionados.includes(dia) ? 'rgba(134,239,172,0.35)' : 'rgba(255,255,255,0.07)'}; border-radius: 4px; padding: 4px 0; font-size: 10px; font-weight: 600; cursor: pointer;">${dia}</button>
              `).join('')}
            </div>
          </div>

          <div>
            <div class="snoopy-modal-label" style="margin-bottom: 5px;">Escopo:</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div id="scope-persistente" style="background: rgba(134,239,172,0.08); border: 1px solid #86efac; border-radius: 6px; padding: 6px 8px; cursor: pointer;">
                <div style="font-size: 11px; font-weight: 700; color: #86efac;">● Persistente</div>
                <div class="snoopy-micro" style="color: #71717a;">Salva no Template Diário</div>
              </div>
              <div id="scope-hoje" style="background: #14141c; border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 6px 8px; cursor: pointer;">
                <div style="font-size: 11px; font-weight: 700; color: #d4d4d8;">○ Apenas Hoje</div>
                <div class="snoopy-micro" style="color: #71717a;">Salva só na nota de hoje</div>
              </div>
            </div>
          </div>

          <div class="snoopy-toolbar" style="justify-content: flex-end;">
            ${habitoParaEditar ? `<button id="btn-cancel-edit" class="snoopy-btn-action snoopy-btn-sm">Cancelar</button>` : ''}
            <button id="btn-save-habit" class="snoopy-btn-primary snoopy-btn-sm" style="font-weight: 700;">${habitoParaEditar ? 'Salvar Alterações' : '+ Cadastrar Hábito'}</button>
          </div>
        </div>

        <div>
          <div class="snoopy-modal-label" style="font-weight: 700; margin-bottom: 6px; display: flex; justify-content: space-between;">
            <span>Hábitos Configurados</span>
            <span id="modal-habits-count" class="snoopy-meta" style="color: #86efac;">0</span>
          </div>
          <div id="modal-habits-list" style="display: flex; flex-direction: column; gap: 5px; max-height: 180px; overflow-y: auto;"></div>
        </div>
      `;

      ModalFactory.abrir({
        htmlContent: modalHtml,
        maxWidth: '470px',
        onMontar: async (box, fechar) => {
          const btnClose = box.querySelector('#modal-close-btn');
          if (btnClose) {
            btnClose.onclick = fechar;
            renderIcon(btnClose, 'x', { size: 13 });
          }

          const inputEl = box.querySelector('#modal-habit-input');
          if (inputEl) setTimeout(() => inputEl.focus(), 40);

          // Alternância de Período
          const chipsP = box.querySelectorAll('.chip-h-p');
          const aplicarVisualPeriodo = () => {
            chipsP.forEach(b => {
              const ativo = b.dataset.val === periodoSelecionado;
              b.style.background = ativo ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.04)';
              b.style.color = ativo ? '#ffffff' : '#a1a1aa';
              b.style.borderColor = ativo ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)';
            });
          };
          chipsP.forEach(b => {
            b.onclick = () => {
              periodoSelecionado = b.dataset.val;
              aplicarVisualPeriodo();
            };
          });
          aplicarVisualPeriodo();

          // Alternância de Dias
          const chipsD = box.querySelectorAll('.chip-h-d');
          const aplicarVisualDias = () => {
            chipsD.forEach(b => {
              const ativo = diasSelecionados.includes(b.dataset.dia);
              b.style.background = ativo ? 'rgba(134,239,172,0.12)' : 'rgba(255,255,255,0.03)';
              b.style.color = ativo ? '#86efac' : '#71717a';
              b.style.borderColor = ativo ? 'rgba(134,239,172,0.35)' : 'rgba(255,255,255,0.07)';
            });
          };
          chipsD.forEach(b => {
            b.onclick = () => {
              const d = b.dataset.dia;
              diasSelecionados = diasSelecionados.includes(d) ? diasSelecionados.filter(x => x !== d) : [...diasSelecionados, d];
              aplicarVisualDias();
            };
          });

          box.querySelector('#btn-pre-todos').onclick = () => { diasSelecionados = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']; aplicarVisualDias(); };
          box.querySelector('#btn-pre-uteis').onclick = () => { diasSelecionados = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']; aplicarVisualDias(); };
          box.querySelector('#btn-pre-fds').onclick = () => { diasSelecionados = ['Dom', 'Sáb']; aplicarVisualDias(); };

          // Alternância de Escopo
          const sPer = box.querySelector('#scope-persistente');
          const sHoj = box.querySelector('#scope-hoje');
          sPer.onclick = () => {
            escopoSelecionado = 'persistente';
            sPer.style.borderColor = '#86efac';
            sPer.style.background = 'rgba(134,239,172,0.08)';
            sHoj.style.borderColor = 'rgba(255,255,255,0.08)';
            sHoj.style.background = '#14141c';
          };
          sHoj.onclick = () => {
            escopoSelecionado = 'hoje';
            sHoj.style.borderColor = '#86efac';
            sHoj.style.background = 'rgba(134,239,172,0.08)';
            sPer.style.borderColor = 'rgba(255,255,255,0.08)';
            sPer.style.background = '#14141c';
          };

          const cancelBtn = box.querySelector('#btn-cancel-edit');
          if (cancelBtn) cancelBtn.onclick = () => { fechar(); abrirModalGerenciarHabitos(); };

          // Carregar lista de hábitos existentes
          const carregarLista = async () => {
            const listEl = box.querySelector('#modal-habits-list');
            listEl.innerHTML = '';
            const dailyF = await garantirNotaDiaria();
            if (!dailyF) {
              listEl.innerHTML = `<div style="font-size: 11px; color: #71717a; text-align: center; padding: 12px;">Nota diária indisponível.</div>`;
              return;
            }
            const raw = await app.vault.read(dailyF);
            const lines = raw.split('\n');
            let inSec = false;
            const items = [];

            lines.forEach(l => {
              if (/^##\s+H[áa]bitos/i.test(l)) { inSec = true; return; }
              if (inSec && /^##\s+/.test(l)) { inSec = false; }
              if (inSec) {
                const match = l.match(REGEX_HABIT_TASK);
                if (match) items.push(TaskParser.parseHabit(match[2].trim()));
              }
            });

            box.querySelector('#modal-habits-count').textContent = items.length;
            if (items.length === 0) {
              listEl.innerHTML = `<div style="font-size: 11px; color: #71717a; text-align: center; padding: 12px;">Nenhum hábito configurado.</div>`;
              return;
            }

            items.forEach(item => {
              const row = document.createElement('div');
              row.style.cssText = 'background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 5px; padding: 6px 8px; display: flex; align-items: center; justify-content: space-between; gap: 6px;';
              
              const leftCol = row.createEl('div', { attr: { style: 'display: flex; align-items: center; gap: 6px; overflow: hidden; flex: 1; min-width: 0;' } });
              leftCol.createEl('span', {
                text: item.cleanName,
                attr: { style: 'font-size: 12px; font-weight: 500; color: #ffffff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;' }
              });
              if (item.periodoIcon) {
                leftCol.createEl('span', {
                  text: item.periodoIcon,
                  attr: { style: 'font-size: 9.5px; padding: 1px 4px; border-radius: 3px; background: rgba(255,255,255,0.06); color: #d4d4d8; flex-shrink: 0;' }
                });
              }
              if (item.freqTag) {
                leftCol.createEl('span', {
                  text: item.freqTag,
                  attr: { style: 'font-size: 9.5px; padding: 1px 4px; border-radius: 3px; background: rgba(134,239,172,0.1); color: #86efac; flex-shrink: 0;' }
                });
              }

              const actionsCol = row.createEl('div', { cls: 'snoopy-toolbar', attr: { style: 'gap: 3px; flex-shrink: 0;' } });
              const btnEdit = actionsCol.createEl('button', {
                cls: 'b-edit snoopy-btn-icon snoopy-btn-sm',
                attr: { title: 'Editar hábito', type: 'button' }
              });
              renderIcon(btnEdit, 'pencil', { size: 11 });

              const btnDel = actionsCol.createEl('button', {
                cls: 'b-del snoopy-btn-icon snoopy-btn-danger snoopy-btn-sm',
                attr: { title: 'Excluir hábito', type: 'button', style: 'color: #f87171;' }
              });
              renderIcon(btnDel, 'trash-2', { size: 11, color: '#f87171' });

              btnEdit.onclick = () => { fechar(); abrirModalGerenciarHabitos(item); };
              btnDel.onclick = async () => {
                await VaultStore.removerLinha(app, dailyF, l => l.includes(item.cleanName));
                const tplFile = app.vault.getAbstractFileByPath('99_Meta/Templates/Template - Diário.md');
                if (tplFile) await VaultStore.removerLinha(app, tplFile, l => l.includes(item.cleanName));
                new Notice(`Hábito excluído: ${item.cleanName}`);
                await carregarLista();
                renderHabitos();
              };
              listEl.appendChild(row);
            });
          };

          await carregarLista();

          // Salvar Hábito
          box.querySelector('#btn-save-habit').onclick = async () => {
            const nome = inputEl ? inputEl.value.trim() : '';
            if (!nome) {
              new Notice('Informe o nome do hábito.');
              return;
            }

            let linha = nome;
            if (periodoSelecionado === 'manha') linha += ' 🌅 Manhã';
            else if (periodoSelecionado === 'tarde') linha += ' ☀️ Tarde';
            else if (periodoSelecionado === 'noite') linha += ' 🌙 Noite';

            if (diasSelecionados.length === 7) linha += ' 🔁 Todos os dias';
            else if (diasSelecionados.length === 5 && !diasSelecionados.includes('Dom') && !diasSelecionados.includes('Sáb')) linha += ' 🔁 Seg-Sex';
            else if (diasSelecionados.length === 2 && diasSelecionados.includes('Dom') && diasSelecionados.includes('Sáb')) linha += ' 🔁 Fins de semana';
            else if (diasSelecionados.length > 0) linha += ` 🔁 ${diasSelecionados.join(',')}`;

            const dailyF = await garantirNotaDiaria();
            const linhaFinal = `- [ ] ${linha}`;

            if (dailyF) {
              if (habitoParaEditar) {
                await VaultStore.substituirLinha(app, dailyF, l => l.includes(habitoParaEditar.cleanName), () => linhaFinal);
                if (escopoSelecionado === 'persistente') {
                  const tplFile = app.vault.getAbstractFileByPath('99_Meta/Templates/Template - Diário.md');
                  if (tplFile) await VaultStore.substituirLinha(app, tplFile, l => l.includes(habitoParaEditar.cleanName), () => linhaFinal);
                }
                new Notice(`Hábito modificado: ${nome}`);
              } else {
                await VaultStore.adicionarLinhaEmSecao(app, dailyF, 'Hábitos', linhaFinal);
                if (escopoSelecionado === 'persistente') {
                  const tplFile = app.vault.getAbstractFileByPath('99_Meta/Templates/Template - Diário.md');
                  if (tplFile) await VaultStore.adicionarLinhaEmSecao(app, tplFile, 'Hábitos', linhaFinal);
                }
                new Notice(`Hábito cadastrado: ${nome}`);
              }
            }

            fechar();
            renderHabitos();
          };
        }
      });
    }

    async function renderHabitos() {
      habitsPillsBox.innerHTML = '';
      const dailyF = app.vault.getAbstractFileByPath(dailyPath);
      let habits = [];

      if (dailyF) {
        const raw = await app.vault.read(dailyF);
        const lines = raw.split('\n');
        let inSec = false;
        lines.forEach(l => {
          if (/^##\s+H[áa]bitos/i.test(l)) { inSec = true; return; }
          if (inSec && /^##\s+/.test(l)) { inSec = false; }
          if (inSec) {
            const m = l.match(REGEX_HABIT_TASK);
            if (m) {
              const parsed = TaskParser.parseHabit(m[2].trim());
              habits.push({ ...parsed, checked: m[1].toLowerCase() === 'x' });
            }
          }
        });
      }

      if (habits.length === 0) {
        ['Leitura 20 min', 'Estudo Algoritmos', 'Pomodoro 4x', 'Exercício Físico'].forEach(name => {
          habits.push({ name, cleanName: name, rawText: name, periodoIcon: '', freqTag: '', checked: false });
        });
      }

      let checkedCount = 0;
      habits.forEach(h => {
        const pill = habitsPillsBox.createEl('div', { 
          cls: 'snoopy-habit-pill',
          attr: { 
            style: `display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 4px 8px; border-radius: 6px; border: 1px solid ${h.checked ? 'rgba(134, 239, 172, 0.35)' : 'rgba(255,255,255,0.08)'}; ${h.checked ? 'background: rgba(134, 239, 172, 0.1);' : 'background: rgba(255,255,255,0.03);'}` 
          }
        });

        const left = pill.createEl('label', { 
          attr: { style: 'display: flex; align-items: center; gap: 7px; overflow: hidden; flex: 1; cursor: pointer; user-select: none;' } 
        });
        const cb = left.createEl('input', { cls: 'snoopy-circle-check', attr: { type: 'checkbox' } });
        cb.checked = h.checked;
        if (h.checked) checkedCount++;

        cb.onchange = async () => {
          const dailyFile = await garantirNotaDiaria();
          if (dailyFile) {
            await VaultStore.substituirLinha(
              app, 
              dailyFile, 
              l => l.includes(h.cleanName), 
              l => cb.checked ? l.replace(/- \[ \]/, '- [x]') : l.replace(/- \[[xX]\]/, '- [ ]')
            );
            new Notice(`Hábito: ${h.cleanName}`);
            renderHabitos();
          }
        };

        if (h.periodoIcon) {
          const isManha = /manh|🌅/i.test(h.periodoIcon);
          const isTarde = /tard|☀️/i.test(h.periodoIcon);
          const isNoite = /noit|🌙/i.test(h.periodoIcon);
          const pSpan = left.createEl('span', { attr: { style: 'display: inline-flex; align-items: center; flex-shrink: 0;', title: `Período: ${isManha ? 'Manhã' : isTarde ? 'Tarde' : 'Noite'}` } });
          if (isManha) renderIcon(pSpan, 'sunrise', { size: 12, color: '#fdba74' });
          else if (isTarde) renderIcon(pSpan, 'sun', { size: 12, color: '#fbbf24' });
          else if (isNoite) renderIcon(pSpan, 'moon', { size: 12, color: '#818cf8' });
        }

        left.createEl('span', { 
          text: h.cleanName,
          attr: { style: `font-size: 12px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; ${h.checked ? 'color: #86efac; font-weight: 600;' : 'color: #e4e4e7;'}` }
        });

        const right = pill.createEl('div', { attr: { style: 'display: flex; align-items: center; gap: 4px; flex-shrink: 0;' } });
        if (h.freqTag && !h.checked) {
          right.createEl('span', {
            cls: 'snoopy-micro',
            text: h.freqTag,
            attr: { style: 'color: #71717a; padding: 1px 4px; border-radius: 3px; background: rgba(255,255,255,0.04);' }
          });
        }

        const btnOpt = right.createEl('button', {
          cls: 'snoopy-btn-icon snoopy-btn-sm',
          attr: { title: 'Modificar hábito', type: 'button', style: 'width: 22px; height: 22px; min-width: 22px; padding: 0;' }
        });
        if (renderIcon) renderIcon(btnOpt, 'more-vertical', { size: 12 });
        else btnOpt.textContent = '⋮';

        btnOpt.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          abrirModalGerenciarHabitos(h);
        };
      });

      const pct = habits.length > 0 ? Math.round((checkedCount / habits.length) * 100) : 0;
      if (habitsBar) habitsBar.style.width = pct + '%';
      const pctEl = habitsHeader.querySelector('#snoopy-habit-pct');
      if (pctEl) pctEl.textContent = `${checkedCount}/${habits.length} • ${pct}%`;
    }

    await renderHabitos();
    return { renderHabitos, abrirModalGerenciarHabitos };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = HabitosView;
}

return HabitosView;


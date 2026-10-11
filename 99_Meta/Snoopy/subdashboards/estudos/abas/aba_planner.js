/**
 * Snoopy Vault - Submódulo: Aba Meu Planner (Estudos)
 * Calendário mensal alinhado de 7 colunas com navegação entre meses,
 * agendamento de blocos de estudo e disparo de foco por matéria.
 *
 * @module subdashboards/estudos/abas/aba_planner
 */

/**
 * Converte data ISO YYYY-MM-DD para o padrão brasileiro DD/MM/YYYY.
 *
 * @private
 * @param {string} dStr - Data ISO.
 * @returns {string}
 */
function formatarDataBR(dStr) {
  if (!dStr) return '';
  const parts = dStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dStr;
}

/**
 * Renderiza a aba Meu Planner dentro do container fornecido.
 *
 * @param {HTMLElement} rootContainer - Elemento pai onde o planner será desenhado.
 * @param {object} ctx - Contexto compartilhado.
 * @param {object} ctx.app - Instância do Obsidian App.
 * @param {object} ctx.estado - Estado atual de estudos em memória.
 * @param {Array<object>} ctx.disciplinas - Lista de matérias processadas.
 * @param {object} ctx.modais - Instância do gerenciador de modais de estudos.
 * @param {number} [ctx.plannerAno] - Ano selecionado para o calendário.
 * @param {number} [ctx.plannerMes] - Mês (0 a 11) selecionado para o calendário.
 * @param {Function} [ctx.setPlannerData] - Callback para alternar ano e mês no orquestrador.
 * @param {Function} ctx.salvarEstado - Função assíncrona para persistir o estado.
 * @param {Function} ctx.onReload - Callback para recarregar a visualização.
 */
function renderAbaPlanner(rootContainer, ctx) {
  const {
    app,
    estado,
    disciplinas = [],
    modais,
    plannerAno: anoInicial,
    plannerMes: mesInicial,
    setPlannerData = () => {},
    salvarEstado = async () => {},
    onReload = () => {}
  } = ctx;

  const now = new Date();
  const padTime = (n) => String(n).padStart(2, '0');
  const todayStr = `${now.getFullYear()}-${padTime(now.getMonth() + 1)}-${padTime(now.getDate())}`;

  let plannerAno = typeof anoInicial === 'number' ? anoInicial : now.getFullYear();
  let plannerMes = typeof mesInicial === 'number' ? mesInicial : now.getMonth();

  const container = rootContainer.createEl('div', {
    attr: { style: 'display: flex; flex-direction: column; gap: 14px;' }
  });

  const mesesNomes = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const diasSemanaNomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Cabeçalho do Calendário com Navegação Mensal
  const calHeader = container.createEl('div', {
    cls: 'snoopy-card-box',
    attr: { style: 'display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; flex-wrap: wrap; gap: 10px;' }
  });

  calHeader.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <span class="snoopy-section-title">MEU PLANNER • CALENDÁRIO MENSAL</span>
      <span class="snoopy-meta">Clique direto no dia para agendar estudo</span>
    </div>

    <div style="display: flex; align-items: center; gap: 8px;">
      <button id="btn-cal-prev" class="snoopy-btn-action" style="font-size: 11px; padding: 4px 10px;">←</button>
      <span id="cal-mes-atual" class="snoopy-meta" style="font-size: 13px; font-weight: 700; color: var(--text-normal); min-width: 140px; text-align: center;">
        ${mesesNomes[plannerMes]} de ${plannerAno}
      </span>
      <button id="btn-cal-next" class="snoopy-btn-action" style="font-size: 11px; padding: 4px 10px;">→</button>
      <button id="btn-cal-hoje" class="snoopy-nav-pill-btn" style="font-size: 10.5px; padding: 3px 8px; margin-left: 4px;">Hoje</button>
    </div>
  `;

  const btnPrev = calHeader.querySelector('#btn-cal-prev');
  if (btnPrev) {
    btnPrev.onclick = () => {
      if (plannerMes === 0) {
        plannerMes = 11;
        plannerAno--;
      } else {
        plannerMes--;
      }
      setPlannerData(plannerAno, plannerMes);
      onReload();
    };
  }

  const btnNext = calHeader.querySelector('#btn-cal-next');
  if (btnNext) {
    btnNext.onclick = () => {
      if (plannerMes === 11) {
        plannerMes = 0;
        plannerAno++;
      } else {
        plannerMes++;
      }
      setPlannerData(plannerAno, plannerMes);
      onReload();
    };
  }

  const btnHoje = calHeader.querySelector('#btn-cal-hoje');
  if (btnHoje) {
    btnHoje.onclick = () => {
      plannerAno = now.getFullYear();
      plannerMes = now.getMonth();
      setPlannerData(plannerAno, plannerMes);
      onReload();
    };
  }

  // Grade do Calendário Mensal (Grid de 7 Colunas)
  const calGridWrapper = container.createEl('div', {
    cls: 'snoopy-card-box',
    attr: { style: 'padding: 14px; display: flex; flex-direction: column; gap: 8px;' }
  });

  // Cabeçalho dos 7 dias da semana
  const calWeekHeader = calGridWrapper.createEl('div', {
    attr: { style: 'display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; text-align: center; border-bottom: 1px solid var(--background-modifier-border); padding-bottom: 8px;' }
  });

  diasSemanaNomes.forEach(dNome => {
    calWeekHeader.createEl('div', {
      attr: { class: 'snoopy-meta', style: 'font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;' },
      text: dNome
    });
  });

  // Cálculos do Mês
  const primeiroDiaSemana = new Date(plannerAno, plannerMes, 1).getDay();
  const totalDiasMes = new Date(plannerAno, plannerMes + 1, 0).getDate();
  const diasMesAnterior = new Date(plannerAno, plannerMes, 0).getDate();

  const calDaysGrid = calGridWrapper.createEl('div', {
    attr: { style: 'display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px;' }
  });

  // Células vazias do mês anterior
  for (let i = primeiroDiaSemana - 1; i >= 0; i--) {
    const diaNum = diasMesAnterior - i;
    const cellOut = calDaysGrid.createEl('div', {
      attr: { style: 'min-height: 80px; padding: 6px; border-radius: 6px; background: rgba(255,255,255,0.01); border: 1px dashed rgba(255,255,255,0.04); opacity: 0.35; display: flex; flex-direction: column; justify-content: space-between;' }
    });
    cellOut.innerHTML = `<span class="snoopy-meta" style="font-size: 10px; text-align: right;">${diaNum}</span>`;
  }

  // Células dos dias do mês atual
  for (let dia = 1; dia <= totalDiasMes; dia++) {
    const dStr = `${plannerAno}-${padTime(plannerMes + 1)}-${padTime(dia)}`;
    const isHoje = dStr === todayStr;
    const blocosDoDia = (estado.planner && estado.planner[dStr]) ? estado.planner[dStr] : [];

    const dayCell = calDaysGrid.createEl('div', {
      attr: {
        style: `min-height: 85px; padding: 6px 8px; border-radius: 6px; background: ${isHoje ? 'var(--background-secondary-alt)' : 'var(--background-secondary)'}; border: 1px solid ${isHoje ? 'var(--interactive-accent, #60a5fa)' : 'var(--background-modifier-border)'}; display: flex; flex-direction: column; gap: 4px; cursor: pointer; transition: border-color 0.15s ease; position: relative;`
      }
    });

    dayCell.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        ${isHoje ? `<span class="snoopy-micro" style="font-size: 8.5px; padding: 1px 4px; border-radius: 3px; background: var(--interactive-accent, #60a5fa); color: #000000; font-weight: bold;">HOJE</span>` : '<span></span>'}
        <span class="snoopy-meta" style="font-size: 11px; font-weight: ${isHoje ? '800' : '600'}; color: ${isHoje ? 'var(--interactive-accent, #60a5fa)' : 'var(--text-normal)'}; text-align: right;">
          ${dia}
        </span>
      </div>
      <div class="day-blocos-box" style="display: flex; flex-direction: column; gap: 3px; flex: 1; overflow-y: auto;">
        ${blocosDoDia.map((b, bIdx) => `
          <div class="cal-bloco-pill snoopy-meta" data-dia="${dStr}" data-idx="${bIdx}" style="padding: 2px 5px; border-radius: 3px; background: rgba(96, 165, 250, 0.16); border-left: 2px solid var(--interactive-accent, #60a5fa); font-size: 9.5px; color: var(--text-normal); display: flex; justify-content: space-between; align-items: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${b.materia} (${b.tempo || '1h'})">
            <span style="overflow: hidden; text-overflow: ellipsis;">${b.materia}</span>
            <span style="color: var(--text-muted); font-size: 8.5px; margin-left: 4px;">${b.tempo || '1h'}</span>
          </div>
        `).join('')}
      </div>
    `;

    dayCell.onclick = (e) => {
      if (e && e.target && e.target.closest && e.target.closest('.cal-bloco-pill')) return;
      abrirModalAgendarBloco(disciplinas, dStr);
    };

    dayCell.querySelectorAll('.cal-bloco-pill').forEach(pill => {
      pill.onclick = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        const dKey = pill.dataset.dia;
        const bIdx = parseInt(pill.dataset.idx, 10);
        if (estado.planner && estado.planner[dKey] && estado.planner[dKey][bIdx]) {
          abrirModalGerenciarBloco(dKey, bIdx, estado.planner[dKey][bIdx], disciplinas);
        }
      };
    });
  }

  // Popup de Agendamento de Bloco
  function abrirModalAgendarBloco(listaDisciplinas, dataInicial = todayStr) {
    const modalBg = document.createElement('div');
    modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';

    const modalBox = document.createElement('div');
    modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 400px; width: 100%; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 12px; font-family: var(--snoopy-font-sans);';

    modalBox.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 14px; font-weight: bold; color: #ffffff;">Agendar Estudo • ${formatarDataBR(dataInicial)}</span>
        <button id="modal-close-plan" style="background: none; border: none; color: #71717a; cursor: pointer; font-size: 14px;">✕</button>
      </div>

      <div>
        <div class="snoopy-modal-label">Data:</div>
        <input id="modal-plan-data" type="date" value="${dataInicial}" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 7px; color: #ffffff; font-size: 11.5px; outline: none;">
      </div>

      <div>
        <div class="snoopy-modal-label">Disciplina:</div>
        <select id="modal-plan-mat" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 7px; color: #ffffff; font-size: 11.5px; outline: none;">
          ${listaDisciplinas.map(m => `<option value="${m.nome}">${m.nome} (${m.categoria || m.area || 'Geral'})</option>`).join('')}
        </select>
      </div>

      <div style="display: flex; gap: 8px;">
        <div style="flex: 1;">
          <div class="snoopy-modal-label">Duração Estimada:</div>
          <input id="modal-plan-tempo" type="text" value="1h30m" placeholder="Ex: 50m, 1h, 2h" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 7px; color: #ffffff; font-size: 11.5px; outline: none;">
        </div>
        <div style="flex: 1;">
          <div class="snoopy-modal-label">Modalidade:</div>
          <select id="modal-plan-tipo" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 7px; color: #ffffff; font-size: 11.5px; outline: none;">
            <option value="Teoria">Teoria</option>
            <option value="Questões">Questões</option>
            <option value="Simulado / Prova">Simulado / Prova</option>
            <option value="Revisão">Revisão</option>
          </select>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px;">
        <button id="modal-cancel-plan" class="snoopy-btn-action" style="font-size: 11px;">Cancelar</button>
        <button id="modal-save-plan" class="snoopy-btn-primary" style="font-size: 11px;">Agendar Bloco</button>
      </div>
    `;

    modalBg.appendChild(modalBox);
    document.body.appendChild(modalBg);

    const fechar = () => { if (modalBg.parentNode) document.body.removeChild(modalBg); };
    modalBg.addEventListener('click', (e) => { if (e.target === modalBg) fechar(); });

    const btnClose = modalBox.querySelector('#modal-close-plan');
    if (btnClose) btnClose.onclick = fechar;
    const btnCancel = modalBox.querySelector('#modal-cancel-plan');
    if (btnCancel) btnCancel.onclick = fechar;

    const btnSave = modalBox.querySelector('#modal-save-plan');
    if (btnSave) {
      btnSave.onclick = async () => {
        const dataVal = modalBox.querySelector('#modal-plan-data').value;
        const matVal = modalBox.querySelector('#modal-plan-mat').value;
        const tempoVal = modalBox.querySelector('#modal-plan-tempo').value;
        const tipoVal = modalBox.querySelector('#modal-plan-tipo').value;

        if (!estado.planner) estado.planner = {};
        if (!estado.planner[dataVal]) estado.planner[dataVal] = [];
        estado.planner[dataVal].push({ materia: matVal, tempo: tempoVal, tipo: tipoVal });

        await salvarEstado();
        if (typeof Notice !== 'undefined') new Notice(`Bloco agendado para ${formatarDataBR(dataVal)}!`);
        fechar();
        onReload();
      };
    }
  }

  // Popup para Gerenciar Bloco Existente
  function abrirModalGerenciarBloco(dia, idx, bloco, listaDisciplinas) {
    const modalBg = document.createElement('div');
    modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';

    const modalBox = document.createElement('div');
    modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 360px; width: 100%; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 12px; font-family: var(--snoopy-font-sans);';

    const discObj = listaDisciplinas.find(d => d.nome === bloco.materia);

    modalBox.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 14px; font-weight: bold; color: #ffffff;">Bloco de Estudo • ${formatarDataBR(dia)}</span>
        <button id="modal-close-mbloco" style="background: none; border: none; color: #71717a; cursor: pointer; font-size: 14px;">✕</button>
      </div>

      <div style="background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-radius: 6px; padding: 10px; display: flex; flex-direction: column; gap: 3px;">
        <div style="font-size: 13.5px; font-weight: bold; color: var(--text-normal);">${bloco.materia}</div>
        <div class="snoopy-meta">${bloco.tempo} • ${bloco.tipo}</div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
        <button id="btn-del-bloco-act" class="snoopy-btn-action" style="font-size: 11px; color: #fca5a5;">Excluir Bloco</button>
        <button id="btn-foco-bloco-act" class="snoopy-btn-primary" style="font-size: 11px;">Iniciar Foco</button>
      </div>
    `;

    modalBg.appendChild(modalBox);
    document.body.appendChild(modalBg);

    const fechar = () => { if (modalBg.parentNode) document.body.removeChild(modalBg); };
    modalBg.addEventListener('click', (e) => { if (e.target === modalBg) fechar(); });

    const btnClose = modalBox.querySelector('#modal-close-mbloco');
    if (btnClose) btnClose.onclick = fechar;

    const btnDel = modalBox.querySelector('#btn-del-bloco-act');
    if (btnDel) {
      btnDel.onclick = async () => {
        if (estado.planner && estado.planner[dia]) {
          estado.planner[dia].splice(idx, 1);
          await salvarEstado();
          if (typeof Notice !== 'undefined') new Notice("Bloco removido!");
          fechar();
          onReload();
        }
      };
    }

    const btnFoco = modalBox.querySelector('#btn-foco-bloco-act');
    if (btnFoco) {
      btnFoco.onclick = () => {
        fechar();
        if (modais && modais.abrirModalSessao) {
          modais.abrirModalSessao(discObj);
        }
      };
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderAbaPlanner, formatarDataBR };
}

return { renderAbaPlanner, formatarDataBR };


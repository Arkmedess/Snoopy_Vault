/**
 * Snoopy Vault - Submódulo: Aba Revisões Espaçadas (Estudos)
 * Apresenta a mesa de repetição espaçada dividida em abas (Programadas, Atrasadas, Concluídas),
 * com cálculo de intervalos (1d, 7d, 14d, 30d) e abertura direta da nota da matéria.
 *
 * @module subdashboards/estudos/abas/aba_revisoes
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
 * Renderiza a aba de Revisões Espaçadas dentro do container fornecido.
 *
 * @param {HTMLElement} rootContainer - Elemento pai onde a lista será desenhada.
 * @param {object} ctx - Contexto compartilhado.
 * @param {object} ctx.app - Instância do Obsidian App.
 * @param {object} ctx.estado - Estado atual de estudos em memória.
 * @param {Array<object>} ctx.disciplinas - Lista de matérias processadas.
 * @param {string} [ctx.revisaoFiltro='programadas'] - Filtro de aba ativo.
 * @param {Function} [ctx.setRevisaoFiltro] - Callback para alternar o filtro ativo.
 * @param {Function} ctx.salvarEstado - Função assíncrona para persistir o estado.
 * @param {Function} ctx.onReload - Callback de re-renderização.
 */
function renderAbaRevisoes(rootContainer, ctx) {
  const {
    app,
    estado,
    revisaoFiltro = 'programadas',
    setRevisaoFiltro = () => {},
    salvarEstado = async () => {},
    onReload = () => {}
  } = ctx;

  const now = new Date();
  const padTime = (n) => String(n).padStart(2, '0');
  const todayStr = `${now.getFullYear()}-${padTime(now.getMonth() + 1)}-${padTime(now.getDate())}`;

  const container = rootContainer.createEl('div', {
    cls: 'snoopy-card-box',
    attr: { style: 'display: flex; flex-direction: column; gap: 14px;' }
  });

  const revisoes = Array.isArray(estado.revisoes) ? estado.revisoes : [];
  const revProgramadas = revisoes.filter(r => r.status === 'programada' && r.proximaRevisao >= todayStr);
  const revAtrasadas = revisoes.filter(r => r.status === 'programada' && r.proximaRevisao < todayStr);
  const revConcluidas = revisoes.filter(r => r.status === 'concluida');

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
      <span class="snoopy-section-title">REVISÕES ESPAÇADAS • CURVA DE ESQUECIMENTO</span>
      <div style="display: flex; gap: 6px;">
        <button id="rev-tab-prog" class="snoopy-btn-mode ${revisaoFiltro === 'programadas' ? 'active' : ''}" style="font-size: 11px; padding: 3px 8px;">
          PROGRAMADAS (${revProgramadas.length})
        </button>
        <button id="rev-tab-atra" class="snoopy-btn-mode ${revisaoFiltro === 'atrasadas' ? 'active' : ''}" style="font-size: 11px; padding: 3px 8px;">
          ATRASADAS (${revAtrasadas.length})
        </button>
        <button id="rev-tab-conc" class="snoopy-btn-mode ${revisaoFiltro === 'concluidas' ? 'active' : ''}" style="font-size: 11px; padding: 3px 8px;">
          CONCLUÍDAS (${revConcluidas.length})
        </button>
      </div>
    </div>
  `;

  const btnProg = container.querySelector('#rev-tab-prog');
  if (btnProg) {
    btnProg.onclick = () => {
      setRevisaoFiltro('programadas');
      onReload();
    };
  }

  const btnAtra = container.querySelector('#rev-tab-atra');
  if (btnAtra) {
    btnAtra.onclick = () => {
      setRevisaoFiltro('atrasadas');
      onReload();
    };
  }

  const btnConc = container.querySelector('#rev-tab-conc');
  if (btnConc) {
    btnConc.onclick = () => {
      setRevisaoFiltro('concluidas');
      onReload();
    };
  }

  const list = container.createEl('div', { attr: { style: 'display: flex; flex-direction: column; gap: 8px;' } });
  const listaExibir = revisaoFiltro === 'programadas' ? revProgramadas : (revisaoFiltro === 'atrasadas' ? revAtrasadas : revConcluidas);

  if (listaExibir.length === 0) {
    list.innerHTML = `
      <div class="snoopy-meta" style="text-align: center; padding: 30px 0;">
        ${revisaoFiltro === 'atrasadas' ? 'Nenhuma revisão atrasada.' : 'Nenhuma revisão nesta aba. Registre sessões para alimentar a repetição espaçada.'}
      </div>
    `;
    return;
  }

  listaExibir.forEach(rev => {
    const row = list.createEl('div', {
      attr: {
        style: 'background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-radius: 6px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;'
      }
    });

    const badgeIntervalo = `${rev.intervaloDias || 1} dia${(rev.intervaloDias || 1) > 1 ? 's' : ''}`;
    row.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span class="snoopy-micro" style="padding: 2px 6px; border-radius: 4px; background: rgba(96, 165, 250, 0.15); color: #93c5fd; font-weight: bold;">
          ${rev.proximaRevisao === todayStr ? 'HOJE' : formatarDataBR(rev.proximaRevisao)}
        </span>
        <span class="prio-badge prio-media" style="font-size: 9.5px;">${badgeIntervalo}</span>
        <div style="display: flex; flex-direction: column;">
          <span style="font-size: 13px; font-weight: 700; color: var(--text-normal);">${rev.nome}</span>
          <span class="snoopy-meta" style="font-size: 10.5px;">${rev.tipo || 'Teoria + Questões'}</span>
        </div>
      </div>

      <div class="snoopy-toolbar">
        ${rev.status !== 'concluida' ? `
          <button class="snoopy-btn-action snoopy-btn-sm btn-rev-open">Abrir Nota</button>
          <button class="snoopy-btn-primary snoopy-btn-sm btn-rev-done">✓ Concluir</button>
        ` : `
          <span class="snoopy-meta" style="color: #86efac; font-weight: bold;">✓ Concluída</span>
        `}
      </div>
    `;

    const btnOpen = row.querySelector('.btn-rev-open');
    if (btnOpen) {
      btnOpen.onclick = () => {
        if (app && app.workspace && app.workspace.openLinkText) {
          app.workspace.openLinkText(rev.materiaPath, "", false);
        }
      };
    }

    const btnDone = row.querySelector('.btn-rev-done');
    if (btnDone) {
      btnDone.onclick = async () => {
        const proxMap = { 1: 7, 7: 14, 14: 30, 30: 30 };
        const novoIntervalo = proxMap[rev.intervaloDias || 1] || 7;

        if (rev.intervaloDias === 30) {
          rev.status = 'concluida';
        } else {
          const proxD = new Date(now.getTime() + novoIntervalo * 86400000);
          rev.proximaRevisao = `${proxD.getFullYear()}-${padTime(proxD.getMonth() + 1)}-${padTime(proxD.getDate())}`;
          rev.intervaloDias = novoIntervalo;
          rev.ultimaRevisao = todayStr;
        }

        await salvarEstado();
        if (typeof Notice !== 'undefined') new Notice(`Revisão concluída! Próxima em ${novoIntervalo} dias.`);
        onReload();
      };
    }
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderAbaRevisoes, formatarDataBR };
}

return { renderAbaRevisoes, formatarDataBR };


/**
 * Snoopy Vault - Submódulo: Aba Revisões Espaçadas (Estudos)
 * Central ativa de retenção com KPIs da curva de esquecimento (1d, 7d, 14d, 30d),
 * agendamento rápido de revisão, vínculo com métricas da matéria e sincronia com a Home.
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
 */
function renderAbaRevisoes(rootContainer, ctx) {
  const {
    app,
    estado = {},
    disciplinas: rawDisciplinas = [],
    modais,
    revisaoFiltro = 'programadas',
    setRevisaoFiltro = () => {},
    salvarEstado = async () => {},
    onReload = () => {},
    getIconHtml,
    uiKit
  } = ctx;

  const paraArrayNativo = (col) => {
    if (!col) return [];
    const out = [];
    if (typeof col.forEach === 'function') {
      col.forEach(item => out.push(item));
      return out;
    }
    if (typeof col.length === 'number') {
      for (let i = 0; i < col.length; i++) out.push(col[i]);
      return out;
    }
    return out;
  };

  const disciplinas = paraArrayNativo(rawDisciplinas);
  const revisoes = paraArrayNativo(estado.revisoes);

  const getIcon = (name, size = 13) => {
    if (typeof getIconHtml === 'function') {
      const res = getIconHtml(name, size);
      if (res) return res;
    }
    if (uiKit && uiKit.ICONS && uiKit.ICONS[name]) {
      return `<span class="snoopy-icon" style="width: ${size}px; height: ${size}px; display: inline-flex; align-items: center; justify-content: center;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="${size}" height="${size}">${uiKit.ICONS[name]}</svg></span>`;
    }
    const fallbackMap = {
      'repeat': '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
      'check': '<polyline points="20 6 9 17 4 12"/>',
      'play': '<polygon points="5 3 19 12 5 21 5 3"/>',
      'plus': '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
      'file-text': '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/>',
      'calendar-plus': '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/>'
    };
    const inner = fallbackMap[name] || '<circle cx="12" cy="12" r="8"/>';
    return `<span class="snoopy-icon" style="width: ${size}px; height: ${size}px; display: inline-flex; align-items: center; justify-content: center;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="${size}" height="${size}">${inner}</svg></span>`;
  };

  const now = new Date();
  const padTime = (n) => String(n).padStart(2, '0');
  const todayStr = `${now.getFullYear()}-${padTime(now.getMonth() + 1)}-${padTime(now.getDate())}`;

  const wrapper = rootContainer.createEl('div', {
    attr: { style: 'display: flex; flex-direction: column; gap: 12px;' }
  });

  const revAtrasadas = revisoes.filter(r => r && r.status === 'programada' && r.proximaRevisao < todayStr);
  const revFuturas = revisoes.filter(r => r && r.status === 'programada' && r.proximaRevisao >= todayStr);
  const revAtivas = revisoes.filter(r => r && r.status === 'programada');
  const revConcluidas = revisoes.filter(r => r && r.status === 'concluida');

  // 1. FAIXA EXECUTIVA DE KPIS DA CURVA DE ESQUECIMENTO
  const kpiGrid = wrapper.createEl('div', {
    attr: { style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px;' }
  });

  const kpisRev = [
    {
      label: 'URGENTES / HOJE',
      val: `${revAtrasadas.length + revFuturas.filter(r => r.proximaRevisao === todayStr).length}`,
      sub: revAtrasadas.length > 0 ? `${revAtrasadas.length} atrasada(s) para recuperar` : 'Nenhuma revisão vencida',
      cor: revAtrasadas.length > 0 ? '#fca5a5' : '#86efac'
    },
    {
      label: 'ATIVAS NO CICLO',
      val: `${revAtivas.length}`,
      sub: `Estágios: 1d • 7d • 14d • 30d`,
      cor: 'var(--text-normal)'
    },
    {
      label: 'CICLOS CONCLUÍDOS',
      val: `${revConcluidas.length}`,
      sub: 'Matérias consolidadas (30d)',
      cor: '#86efac'
    },
    {
      label: 'COBERTURA DO EDITAL',
      val: `${disciplinas.length > 0 ? Math.min(100, Math.round((revAtivas.length / disciplinas.length) * 100)) : 0}%`,
      sub: `${revAtivas.length} de ${disciplinas.length} matéria(s) em revisão`,
      cor: '#93c5fd'
    }
  ];

  kpisRev.forEach(k => {
    const kCard = kpiGrid.createEl('div', {
      attr: { style: 'background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 8px; padding: 10px 14px; display: flex; flex-direction: column; gap: 3px;' }
    });
    kCard.innerHTML = `
      <span class="snoopy-micro" style="color: var(--text-muted); font-weight: 700;">${k.label}</span>
      <span class="snoopy-meta" style="font-size: 18px; font-weight: 800; color: ${k.cor};">${k.val}</span>
      <span class="snoopy-meta" style="font-size: 10px; color: var(--text-muted);">${k.sub}</span>
    `;
  });

  // 2. CARD PRINCIPAL DE REVISÕES + BARRA DE AGENDAMENTO RÁPIDO
  const container = wrapper.createEl('div', {
    cls: 'snoopy-card-box',
    attr: { style: 'display: flex; flex-direction: column; gap: 12px; padding: 14px 16px;' }
  });

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
      <span class="snoopy-section-title" style="display: inline-flex; align-items: center; gap: 6px; font-size: 15px;">
        ${getIcon('repeat', 14)}
        <span>REVISÕES ESPAÇADAS • CURVA DE ESQUECIMENTO</span>
      </span>
      <div style="display: flex; gap: 6px; flex-wrap: wrap;">
        <button id="rev-tab-prog" class="snoopy-btn-mode ${revisaoFiltro === 'programadas' ? 'active' : ''}" style="font-size: 11px; padding: 3px 9px;">
          ATIVAS & HOJE (${revAtivas.length})
        </button>
        <button id="rev-tab-atra" class="snoopy-btn-mode ${revisaoFiltro === 'atrasadas' ? 'active' : ''}" style="font-size: 11px; padding: 3px 9px;">
          ATRASADAS (${revAtrasadas.length})
        </button>
        <button id="rev-tab-conc" class="snoopy-btn-mode ${revisaoFiltro === 'concluidas' ? 'active' : ''}" style="font-size: 11px; padding: 3px 9px;">
          CONCLUÍDAS (${revConcluidas.length})
        </button>
      </div>
    </div>

    <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 8px; background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-radius: 6px; padding: 7px 10px;">
      <span class="snoopy-micro" style="font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Programar Revisão:</span>
      <select id="quick-rev-mat" style="flex: 1.5; min-width: 160px; background: var(--background-primary); border: 1px solid var(--background-modifier-border); border-radius: 4px; padding: 4px 8px; font-size: 11.5px; color: var(--text-normal); outline: none;">
        ${disciplinas.length > 0
          ? disciplinas.map(d => `<option value="${d.path || `03_Estudos/${d.nome}.md`}" data-nome="${d.nome}">${d.nome} (${d.area || d.categoria || 'Geral'})</option>`).join('')
          : '<option value="03_Estudos/Geral.md">Cadastre uma matéria</option>'}
      </select>
      <select id="quick-rev-dias" style="background: var(--background-primary); border: 1px solid var(--background-modifier-border); border-radius: 4px; padding: 4px 8px; font-size: 11px; color: var(--text-normal); outline: none;">
        <option value="0">Para Hoje (Imediata)</option>
        <option value="1" selected>Ciclo 1d (Amanhã)</option>
        <option value="7">Ciclo 7d (1 Semana)</option>
        <option value="14">Ciclo 14d (Quinzenal)</option>
        <option value="30">Ciclo 30d (Mensal)</option>
      </select>
      <select id="quick-rev-tipo" style="background: var(--background-primary); border: 1px solid var(--background-modifier-border); border-radius: 4px; padding: 4px 8px; font-size: 11px; color: var(--text-normal); outline: none;">
        <option value="Questões + Erros">Questões + Erros</option>
        <option value="Flashcards & Resumo">Flashcards & Resumo</option>
        <option value="Teoria + Questões">Teoria + Questões</option>
      </select>
      <button id="btn-quick-rev-add" class="snoopy-btn-primary snoopy-btn-sm" style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px;">
        ${getIcon('plus', 11)}
        <span>Incluir na Curva</span>
      </button>
    </div>
  `;

  const btnProg = container.querySelector('#rev-tab-prog');
  if (btnProg) btnProg.onclick = () => { setRevisaoFiltro('programadas'); onReload(); };

  const btnAtra = container.querySelector('#rev-tab-atra');
  if (btnAtra) btnAtra.onclick = () => { setRevisaoFiltro('atrasadas'); onReload(); };

  const btnConc = container.querySelector('#rev-tab-conc');
  if (btnConc) btnConc.onclick = () => { setRevisaoFiltro('concluidas'); onReload(); };

  const btnAddRev = container.querySelector('#btn-quick-rev-add');
  if (btnAddRev) {
    btnAddRev.onclick = async () => {
      const matSel = container.querySelector('#quick-rev-mat');
      const diasSel = container.querySelector('#quick-rev-dias');
      const tipoSel = container.querySelector('#quick-rev-tipo');
      const matPath = (matSel && matSel.value) || '';
      if (!matPath) return;

      const discMatch = disciplinas.find(d => d.path === matPath || `03_Estudos/${d.nome}.md` === matPath);
      const nomeMat = discMatch ? discMatch.nome : matPath.replace(/^03_Estudos\/|\.md$/g, '');
      const dias = parseInt((diasSel && diasSel.value) || '1', 10);
      const tipo = (tipoSel && tipoSel.value) || 'Questões + Erros';

      const targetDate = new Date(now.getTime() + dias * 86400000);
      const proxStr = `${targetDate.getFullYear()}-${padTime(targetDate.getMonth() + 1)}-${padTime(targetDate.getDate())}`;

      if (!Array.isArray(estado.revisoes)) estado.revisoes = [];
      estado.revisoes = estado.revisoes.filter(r => r.materiaPath !== matPath && r.nome !== nomeMat);
      estado.revisoes.push({
        materiaPath: matPath,
        nome: nomeMat,
        ultimaRevisao: todayStr,
        proximaRevisao: proxStr,
        intervaloDias: Math.max(1, dias),
        tipo,
        status: 'programada'
      });

      await salvarEstado();
      if (typeof Notice !== 'undefined') new Notice(`Revisão de "${nomeMat}" programada para ${formatarDataBR(proxStr)}!`);
      onReload();
    };
  }

  const list = container.createEl('div', { attr: { style: 'display: flex; flex-direction: column; gap: 7px;' } });
  // Em 'programadas', exibe todas as revisões ativas ordenadas por data (atrasadas/hoje primeiro!)
  const listaExibir = revisaoFiltro === 'programadas'
    ? [...revAtivas].sort((a, b) => String(a.proximaRevisao || '').localeCompare(String(b.proximaRevisao || '')))
    : (revisaoFiltro === 'atrasadas' ? revAtrasadas : revConcluidas);

  if (listaExibir.length === 0) {
    list.innerHTML = `
      <div class="snoopy-meta" style="text-align: center; padding: 22px 0;">
        ${revisaoFiltro === 'atrasadas' ? 'Nenhuma revisão atrasada. Excelente ritmo!' : 'Nenhuma revisão nesta visualização. Use a barra acima para incluir uma matéria na curva.'}
      </div>
    `;
    return;
  }

  listaExibir.forEach(rev => {
    const isAtrasada = rev.status === 'programada' && rev.proximaRevisao < todayStr;
    const isHoje = rev.proximaRevisao === todayStr;
    const discObj = disciplinas.find(d => d.path === rev.materiaPath || d.nome === rev.nome || (d.file && d.file.name === rev.nome));
    const nomeExibicao = discObj ? discObj.nome : rev.nome;
    const pctDisc = discObj ? (discObj.pct || 0) : null;
    const placarDisc = discObj && discObj.feitas > 0 ? `${discObj.acertos || 0}/${discObj.feitas} (${pctDisc}%)` : null;

    const row = list.createEl('div', {
      attr: {
        style: `background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-left: 3px solid ${isAtrasada ? '#f87171' : (isHoje ? '#60a5fa' : '#86efac')}; border-radius: 6px; padding: 9px 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;`
      }
    });

    const estagioAtual = Number(rev.intervaloDias) || 1;
    const trilhaEstagios = [1, 7, 14, 30].map(d => `
      <span class="snoopy-micro" style="font-size: 9px; padding: 1px 5px; border-radius: 3px; ${d === estagioAtual ? 'background: rgba(96, 165, 250, 0.22); color: #93c5fd; font-weight: 800; border: 1px solid rgba(96, 165, 250, 0.4);' : 'background: rgba(255,255,255,0.04); color: var(--text-muted); opacity: 0.65;'}">${d}d</span>
    `).join('');

    row.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
        <span class="snoopy-micro" style="padding: 2px 7px; border-radius: 4px; background: ${isAtrasada ? 'rgba(248, 113, 113, 0.16)' : 'rgba(96, 165, 250, 0.15)'}; color: ${isAtrasada ? '#fca5a5' : '#93c5fd'}; font-weight: bold;">
          ${isHoje ? 'HOJE' : (isAtrasada ? `VENCIDA (${formatarDataBR(rev.proximaRevisao).slice(0, 5)})` : formatarDataBR(rev.proximaRevisao))}
        </span>
        <div style="display: flex; gap: 3px; align-items: center;" title="Progresso na Curva de Esquecimento (1d → 7d → 14d → 30d)">
          ${trilhaEstagios}
        </div>
        <div style="display: flex; flex-direction: column; gap: 1px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 13px; font-weight: 700; color: var(--text-normal);">${nomeExibicao}</span>
            ${placarDisc ? `<span class="snoopy-micro" style="padding: 1px 6px; border-radius: 3px; background: rgba(134, 239, 172, 0.12); color: #86efac;">Assertividade: ${placarDisc}</span>` : ''}
          </div>
          <span class="snoopy-meta" style="font-size: 10.5px;">${rev.tipo || 'Teoria + Questões'}${discObj ? ` • Área: ${discObj.area || discObj.categoria || 'Geral'}` : ''}</span>
        </div>
      </div>

      <div class="snoopy-toolbar" style="gap: 6px;">
        ${rev.status !== 'concluida' ? `
          <button class="snoopy-btn-action snoopy-btn-sm btn-rev-open" style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; padding: 3px 8px;">
            ${getIcon('file-text', 11)}
            <span>Nota</span>
          </button>
          <button class="snoopy-btn-action snoopy-btn-sm btn-rev-foco" style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; padding: 3px 8px;" title="Registrar bateria de questões de revisão">
            ${getIcon('play', 10)}
            <span>Revisar</span>
          </button>
          <button class="snoopy-btn-primary snoopy-btn-sm btn-rev-done" style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; padding: 3px 9px;">
            ${getIcon('check', 11)}
            <span>Avançar Curva</span>
          </button>
        ` : `
          <span class="snoopy-meta" style="color: #86efac; font-weight: bold; display: inline-flex; align-items: center; gap: 4px;">
            ${getIcon('check', 12)}
            <span>Consolidada</span>
          </span>
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

    const btnFoco = row.querySelector('.btn-rev-foco');
    if (btnFoco) {
      btnFoco.onclick = () => {
        if (modais && modais.abrirModalSessao) {
          modais.abrirModalSessao(discObj || { nome: nomeExibicao, path: rev.materiaPath });
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
        if (typeof Notice !== 'undefined') new Notice(`Revisão concluída! Próximo estágio em ${novoIntervalo} dias.`);
        onReload();
      };
    }
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderAbaRevisoes, formatarDataBR };
}

return { renderAbaRevisoes, formatarDataBR };

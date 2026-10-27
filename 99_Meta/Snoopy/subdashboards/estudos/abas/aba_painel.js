/**
 * Snoopy Vault - Submódulo: Aba Painel de Controle (Estudos)
 * Mantém a estrutura executiva limpa e sequencial:
 * 1. Filtro por Área
 * 2. Gráficos Superiores (Donut + Linha 7D)
 * 3. 4 KPIs Consolidados
 * 4. Radar Duplo Limpo (Ciclo Ativo + Revisões para Hoje)
 * 5. Tabela de Matérias & Simulados (com cadastro rápido, cronômetro contínuo de prova e placar de questões/acertos/erros/tempo integrados sem poluição visual).
 *
 * @module subdashboards/estudos/abas/aba_painel
 */

/**
 * Renderiza a aba Painel de Controle dentro do container fornecido.
 *
 * @param {HTMLElement} rootContainer - Elemento onde a aba será renderizada.
 * @param {object} ctx - Contexto compartilhado com dados e utilitários.
 */
function renderAbaPainel(rootContainer, ctx) {
  const {
    app,
    dv,
    estado = {},
    disciplinas: rawDisciplinas = [],
    graficosSvg,
    modais,
    categoriaFiltroAtiva = 'Todas',
    setCategoriaFiltroAtiva = () => {},
    obterFilaDoCiclo = (d) => d,
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

  const getDataAttr = (el, key) => {
    if (el && el.dataset && el.dataset[key] !== undefined) return el.dataset[key];
    if (el && typeof el.getAttribute === 'function') return el.getAttribute(`data-${key}`);
    if (el && el.attrs && el.attrs[`data-${key}`] !== undefined) return el.attrs[`data-${key}`];
    return '';
  };

  const disciplinas = paraArrayNativo(rawDisciplinas);
  const simulados = paraArrayNativo(estado.simulados);

  const getIcon = (name, size = 14) => {
    if (typeof getIconHtml === 'function') {
      const res = getIconHtml(name, size);
      if (res) return res;
    }
    if (uiKit && uiKit.ICONS && uiKit.ICONS[name]) {
      return `<span class="snoopy-icon" style="width: ${size}px; height: ${size}px; display: inline-flex; align-items: center; justify-content: center;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="${size}" height="${size}">${uiKit.ICONS[name]}</svg></span>`;
    }
    const fallbackMap = {
      'settings': '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
      'check': '<polyline points="20 6 9 17 4 12"/>',
      'file-text': '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>',
      'arrow-right': '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
      'play': '<polygon points="5 3 19 12 5 21 5 3"/>',
      'pause': '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
      'plus': '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
      'more-vertical': '<circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>',
      'filter': '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
      'target': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="6" r="6"/><circle cx="12" cy="12" r="2"/>',
      'clock': '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
      'x': '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
      'calendar-plus': '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/>',
      'list-checks': '<line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><polyline points="3 6 4 7 6 5"/><polyline points="3 12 4 13 6 11"/><polyline points="3 18 4 19 6 17"/>',
      'brain': '<path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04z"/>',
      'refresh-cw': '<path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>',
      'calendar-check': '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/>',
      'sparkles': '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>'
    };
    const svgInner = fallbackMap[name] || '<circle cx="12" cy="12" r="8"/>';
    return `<span class="snoopy-icon" style="width: ${size}px; height: ${size}px; display: inline-flex; align-items: center; justify-content: center;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="${size}" height="${size}">${svgInner}</svg></span>`;
  };

  const container = rootContainer.createEl('div', {
    attr: { style: 'display: flex; flex-direction: column; gap: 16px;' }
  });

  const now = new Date();
  const padTime = (n) => String(n).padStart(2, '0');
  const todayStr = `${now.getFullYear()}-${padTime(now.getMonth() + 1)}-${padTime(now.getDate())}`;

  // 1. FILTRO HORIZONTAL POR ÁREA (Limpo, apenas categorias reais)
  const categoriasSet = new Set(['Todas']);
  disciplinas.forEach(d => {
    if (d.area || d.categoria) categoriasSet.add(d.area || d.categoria);
  });
  if (disciplinas.length === 0) {
    ['Programação', 'ENEM', 'Concurso', 'Geral'].forEach(c => categoriasSet.add(c));
  } else if (categoriaFiltroAtiva && categoriaFiltroAtiva !== 'Todas') {
    categoriasSet.add(categoriaFiltroAtiva);
  }
  const categoriasLista = Array.from(categoriasSet);

  const filterRow = container.createEl('div', {
    attr: { style: 'display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding: 2px 4px; margin-bottom: 4px;' }
  });

  const filterLeft = filterRow.createEl('div', {
    attr: { style: 'display: flex; align-items: center; gap: 8px; flex-wrap: wrap;' }
  });
  filterLeft.innerHTML = `
    <span class="snoopy-meta" style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; display: inline-flex; align-items: center; gap: 5px;">
      ${getIcon('filter', 12)}
      <span>Área:</span>
    </span>
  `;

  const pillsContainer = filterLeft.createEl('div', { attr: { style: 'display: flex; gap: 6px; flex-wrap: wrap;' } });
  categoriasLista.forEach(cat => {
    const isAtiva = categoriaFiltroAtiva === cat;
    const count = cat === 'Todas'
      ? disciplinas.length
      : disciplinas.filter(d => (d.area || d.categoria || '').toLowerCase() === cat.toLowerCase()).length;

    const pill = pillsContainer.createEl('button', {
      cls: `snoopy-btn-mode ${isAtiva ? 'active' : ''}`,
      attr: { style: `font-size: 11px; padding: 4px 10px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; ${isAtiva ? 'background: var(--text-normal); color: var(--background-primary); font-weight: bold;' : ''}` }
    });
    pill.innerHTML = `<span>${cat}</span><span class="snoopy-micro" style="opacity: 0.75;">(${count})</span>`;
    pill.onclick = () => {
      setCategoriaFiltroAtiva(cat);
      onReload();
    };
  });

  const disciplinasFiltradas = categoriaFiltroAtiva === 'Todas'
    ? disciplinas
    : disciplinas.filter(d => (d.area || d.categoria || '').toLowerCase() === categoriaFiltroAtiva.toLowerCase());

  let totalMinutosGlobal = 0;
  let totalQuestoesGlobal = 0;
  let totalAcertosGlobal = 0;
  let totalErrosGlobal = 0;

  disciplinasFiltradas.forEach(d => {
    totalMinutosGlobal += d.minutos || 0;
    totalQuestoesGlobal += d.feitas || 0;
    totalAcertosGlobal += d.acertos || 0;
    totalErrosGlobal += d.erros || 0;
  });

  // CÁLCULO DOS ÚLTIMOS 7 DIAS
  const ultimos7Dias = [];
  const diasSemanaNomesCurtos = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  let somaMinutos7d = 0;
  let somaQuestoes7d = 0;

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dStr = `${d.getFullYear()}-${padTime(d.getMonth() + 1)}-${padTime(d.getDate())}`;
    const isHoje = dStr === todayStr;

    let minDia = 0;
    let questDia = 0;
    let materiasDia = [];

    if (estado.historicoDiario && estado.historicoDiario[dStr]) {
      minDia += Number(estado.historicoDiario[dStr].minutosFoco) || 0;
      questDia += Number(estado.historicoDiario[dStr].questoesFeitas) || 0;
      if (Array.isArray(estado.historicoDiario[dStr].materias)) {
        materiasDia = [...estado.historicoDiario[dStr].materias];
      }
    }

    if (estado.planner && Array.isArray(estado.planner[dStr])) {
      estado.planner[dStr].forEach(b => {
        if (b && b.materia && !materiasDia.includes(b.materia)) {
          materiasDia.push(b.materia);
        }
      });
    }

    if (dv && typeof dv.page === 'function') {
      try {
        const dailyPage = dv.page(`01_Inbox/Diário/${dStr}`) || dv.page(`"01_Inbox/Diário/${dStr}"`);
        if (dailyPage) {
          if (dailyPage.pomodoros) {
            const pMin = Number(dailyPage.pomodoros) * 25;
            if (pMin > minDia) minDia = pMin;
          }
          if (dailyPage.file && dailyPage.file.tasks) {
            dailyPage.file.tasks.forEach(t => {
              const mMatch = t.text.match(/\[\[(?:03_Estudos\/)?([^\]|]+)/);
              if (mMatch && mMatch[1] && !materiasDia.includes(mMatch[1].trim())) {
                materiasDia.push(mMatch[1].trim());
              }
            });
          }
        }
      } catch (_) {
        // Ignora erro caso nota diária não exista
      }
    }

    if (minDia > 0 && materiasDia.length === 0) {
      if (disciplinasFiltradas.length > 0 && disciplinasFiltradas[0].nome) {
        materiasDia.push(disciplinasFiltradas[0].nome);
      } else {
        materiasDia.push('Estudo Geral');
      }
    }

    somaMinutos7d += minDia;
    somaQuestoes7d += questDia;

    ultimos7Dias.push({
      dataStr: dStr,
      diaSemana: diasSemanaNomesCurtos[d.getDay()],
      diaMes: `${padTime(d.getDate())}/${padTime(d.getMonth() + 1)}`,
      minutos: minDia,
      questoes: questDia,
      materias: materiasDia,
      isHoje
    });
  }

  const minutosEfetivos = (categoriaFiltroAtiva === 'Todas' || disciplinasFiltradas.length === disciplinas.length)
    ? Math.max(totalMinutosGlobal, somaMinutos7d)
    : totalMinutosGlobal;

  const totalHorasTxt = `${Math.floor(minutosEfetivos / 60)}h${minutosEfetivos % 60}m`;
  const pctAcertosGeral = totalQuestoesGlobal > 0 ? Math.round((totalAcertosGlobal / totalQuestoesGlobal) * 100) : 0;

  const mediaMinutosDia = Math.round(somaMinutos7d / 7);
  const mediaHorasTxt = mediaMinutosDia >= 60 ? `${Math.floor(mediaMinutosDia / 60)}h${mediaMinutosDia % 60}m` : `${mediaMinutosDia}m`;
  const maxMinutosPlot = Math.max(60, ...ultimos7Dias.map(p => p.minutos)) * 1.15;

  // 2. FAIXA EXECUTIVA DE KPIS DE PULSO (4 Cards Limpos Padronizados no Topo)
  const filaCiclo = paraArrayNativo(obterFilaDoCiclo(disciplinas));
  let currentIdx = estado.disciplinaAtualIdx || 0;
  if (currentIdx >= filaCiclo.length) currentIdx = 0;
  const materiaVez = filaCiclo[currentIdx];
  const revsHoje = paraArrayNativo(estado.revisoes).filter(r => r && r.status === 'programada' && r.proximaRevisao <= todayStr);

  const metaHorasSemanal = Number(estado.metaHorasSemanal) || 20;
  const pctMetaHoras = Math.min(100, Math.round((somaMinutos7d / (metaHorasSemanal * 60)) * 100));
  const horas7dTxt = `${Math.floor(somaMinutos7d / 60)}h${somaMinutos7d % 60}m`;

  const kpiGrid = container.createEl('div', {
    attr: { style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 8px;' }
  });

  const feedbackFoco = pctMetaHoras >= 100
    ? `7D: ${horas7dTxt} (${pctMetaHoras}%) • Meta semanal batida!`
    : (somaMinutos7d > 0
      ? `7D: ${horas7dTxt} de ${metaHorasSemanal}h (${pctMetaHoras}%)`
      : `Meta de ${metaHorasSemanal}h • Inicie seu primeiro ciclo`);

  const feedbackAssertividade = pctAcertosGeral >= 80
    ? 'Desempenho excelente! Alto nível de fixação'
    : (pctAcertosGeral >= 60
      ? 'Ritmo consistente! Foco em eliminar dúvidas'
      : (pctAcertosGeral > 0
        ? 'Reforce a teoria e resolva questões'
        : 'Resolva questões para calibrar seu radar'));

  const kpisConsolidados = [
    {
      icon: 'clock',
      label: 'TEMPO DE FOCO & META 7D',
      val: totalHorasTxt,
      sub: feedbackFoco,
      cor: 'var(--text-normal)',
      barPct: pctMetaHoras,
      barCor: 'var(--interactive-accent, #60a5fa)'
    },
    {
      icon: 'list-checks',
      label: 'PLACAR DE QUESTÕES',
      val: `${totalQuestoesGlobal}`,
      sub: totalQuestoesGlobal > 0 ? `${totalAcertosGlobal} acertos • ${totalErrosGlobal} a revisar (${pctAcertosGeral}%)` : 'Nenhuma questão registrada ainda',
      cor: 'var(--text-normal)',
      barPct: totalQuestoesGlobal > 0 ? pctAcertosGeral : 0,
      barCor: '#86efac'
    },
    {
      icon: 'target',
      label: 'ASSERTIVIDADE GERAL',
      val: `${pctAcertosGeral}%`,
      sub: feedbackAssertividade,
      cor: pctAcertosGeral >= 80 ? '#86efac' : (pctAcertosGeral > 0 ? 'var(--text-normal)' : 'var(--text-muted)'),
      barPct: pctAcertosGeral,
      barCor: pctAcertosGeral >= 80 ? '#86efac' : (pctAcertosGeral >= 60 ? '#60a5fa' : '#fca5a5')
    },
    {
      icon: 'brain',
      label: 'RADAR DE RETENÇÃO',
      val: revsHoje.length > 0 ? (revsHoje.length === 1 ? '1 revisão' : `${revsHoje.length} revisões`) : 'Em dia',
      sub: revsHoje.length === 0
        ? 'Tudo em dia! Sem revisões acumuladas hoje'
        : (revsHoje.length === 1
          ? `Vez: ${materiaVez ? materiaVez.nome : 'Revisão'} • Prioritária para hoje`
          : `${revsHoje.length} revisões prioritárias para hoje`),
      cor: revsHoje.length > 0 ? '#fca5a5' : '#86efac',
      barPct: filaCiclo.length > 0 ? Math.round(((currentIdx + 1) / filaCiclo.length) * 100) : 100,
      barCor: revsHoje.length > 0 ? '#fca5a5' : '#86efac'
    }
  ];

  kpisConsolidados.forEach(k => {
    const cardEl = kpiGrid.createEl('div', {
      attr: { style: 'background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-radius: 8px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; transition: border-color 0.15s ease;' }
    });
    cardEl.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <span class="snoopy-kpi-label snoopy-micro" style="color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; display: inline-flex; align-items: center; gap: 5px;">
          ${getIcon(k.icon, 13)}
          <span>${k.label}</span>
        </span>
      </div>
      <span class="snoopy-kpi-val" style="font-size: 20px; font-weight: 800; color: ${k.cor}; line-height: 1.15;">${k.val}</span>
      <div class="snoopy-prog-track" style="height: 4px; width: 100%; margin: 2px 0; border-radius: 2px; overflow: hidden; background: rgba(255, 255, 255, 0.08);">
        <div class="snoopy-prog-fill" style="width: ${k.barPct}%; background: ${k.barCor}; height: 100%;"></div>
      </div>
      <span class="snoopy-meta" style="font-size: 11px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${k.sub}</span>
    `;
  });

  // 3. ZONA CENTRAL: FOCO NO PLANNER & EXECUÇÃO DO DIA (Grid 60/40 - Inspirado no Estudei)
  const coreWorkspaceGrid = container.createEl('div', {
    cls: 'snoopy-estudos-workspace-grid'
  });

  // COLUNA ESQUERDA: O QUE ESTUDAR HOJE (Ciclo Ativo + Planejamento do Dia)
  const leftColPlanner = coreWorkspaceGrid.createEl('div', {
    attr: { style: 'display: flex; flex-direction: column; gap: 14px;' }
  });

  // CARD 1: MATÉRIA DA VEZ (Ponto de Ação Imediata)
  const cicloCard = leftColPlanner.createEl('div', {
    cls: 'snoopy-card-box',
    attr: { style: 'display: flex; flex-direction: column; gap: 12px; padding: 16px;' }
  });

  if (materiaVez) {
    const isCicloUnitario = filaCiclo.length <= 1;
    cicloCard.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span class="snoopy-section-title" style="display: inline-flex; align-items: center; gap: 6px;">
          ${getIcon('refresh-cw', 13)}
          <span>CICLO ATIVO • MATÉRIA DA VEZ</span>
        </span>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="snoopy-meta" style="color: var(--interactive-accent, #60a5fa); font-weight: bold;">${isCicloUnitario ? '1 de 1' : `${currentIdx + 1} de ${filaCiclo.length}`}</span>
          <button id="btn-radar-cfg-ciclo" class="snoopy-btn-action" style="padding: 3px 6px; display: inline-flex; align-items: center;" title="Organizar Fila do Ciclo">${getIcon('settings', 12)}</button>
        </div>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-left: 3px solid var(--interactive-accent, #60a5fa); border-radius: 6px; padding: 12px 14px;">
        <div style="display: flex; flex-direction: column; gap: 4px; overflow: hidden; padding-right: 8px;">
          <span style="font-size: 15px; font-weight: 700; color: var(--text-normal); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${materiaVez.nome}</span>
          <span class="snoopy-meta" style="font-size: 11.5px;">${materiaVez.area || materiaVez.categoria || 'Geral'} • ${materiaVez.acertos || 0}/${materiaVez.feitas || 0} questões • ${materiaVez.minutos || 0}m de foco acumulado</span>
        </div>
        <div style="display: flex; gap: 6px; flex-shrink: 0;">
          <button id="btn-radar-foco" class="snoopy-btn-primary" style="font-size: 11px; padding: 6px 14px; display: inline-flex; align-items: center; gap: 5px;">
            ${getIcon('play', 11)}
            <span>Iniciar Foco</span>
          </button>
          <button id="btn-radar-next" class="snoopy-btn-action" style="font-size: 11px; padding: 6px 10px; display: inline-flex; align-items: center; gap: 4px;" title="${isCicloUnitario ? 'Ciclo unitário (1 matéria cadastrada)' : 'Avançar ciclo'}">
            <span>Avançar</span>
            ${getIcon('arrow-right', 11)}
          </button>
        </div>
      </div>
    `;

    const btnCfgCiclo = cicloCard.querySelector('#btn-radar-cfg-ciclo');
    if (btnCfgCiclo) btnCfgCiclo.onclick = () => modais.abrirModalOrganizarCiclo(disciplinas);

    const btnFoco = cicloCard.querySelector('#btn-radar-foco');
    if (btnFoco) btnFoco.onclick = () => modais.abrirModalSessao(materiaVez);

    const btnNext = cicloCard.querySelector('#btn-radar-next');
    if (btnNext) {
      btnNext.onclick = async () => {
        if (filaCiclo.length <= 1) {
          if (typeof Notice !== 'undefined') new Notice(`Ciclo unitário ativo (${filaCiclo[0].nome}). Cadastre novas matérias para alternância rotativa!`);
          return;
        }
        const prox = (currentIdx + 1) % filaCiclo.length;
        estado.disciplinaAtualIdx = prox;
        await salvarEstado();
        if (typeof Notice !== 'undefined') new Notice(`Ciclo avançado! Próxima: ${filaCiclo[prox].nome}`);
        onReload();
      };
    }
  } else {
    cicloCard.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span class="snoopy-section-title" style="display: inline-flex; align-items: center; gap: 6px;">
          ${getIcon('refresh-cw', 13)}
          <span>CICLO ATIVO</span>
        </span>
        <button id="btn-radar-cfg-vazio" class="snoopy-btn-action" style="font-size: 10px; padding: 2px 6px;">Organizar</button>
      </div>
      <div class="snoopy-meta" style="padding: 12px 0;">Cadastre matérias para iniciar a fila rotativa.</div>
    `;
    const btnVazio = cicloCard.querySelector('#btn-radar-cfg-vazio');
    if (btnVazio) btnVazio.onclick = () => modais.abrirModalOrganizarCiclo(disciplinas);
  }

  // CARD 2: CRONOGRAMA DE HOJE / SESSÕES DO PLANNER (Show, Don't Tell - Foco no Planner)
  const blocosHoje = (estado.planner && estado.planner[todayStr]) ? paraArrayNativo(estado.planner[todayStr]) : [];
  const sessoesExibicao = blocosHoje.length > 0
    ? blocosHoje
    : filaCiclo.slice(0, 3).map((m, i) => ({
        materia: m.nome,
        tipo: i === 0 ? 'TEORIA' : (i === 1 ? 'QUESTÕES' : 'REVISÃO'),
        duracaoMin: 50,
        concluido: (m.minutos || 0) > 0,
        area: m.area || m.categoria || 'Geral'
      }));

  const plannerCard = leftColPlanner.createEl('div', {
    cls: 'snoopy-card-box',
    attr: { style: 'display: flex; flex-direction: column; gap: 12px; padding: 16px;' }
  });

  const coresBordas = ['#60a5fa', '#a78bfa', '#86efac', '#fdba74', '#f472b6'];

  plannerCard.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span class="snoopy-section-title" style="display: inline-flex; align-items: center; gap: 6px;">
        ${getIcon('calendar-plus', 13)}
        <span>CRONOGRAMA DE HOJE • PLANEJAMENTO DO DIA</span>
      </span>
      <span class="snoopy-meta" style="color: var(--text-muted);">${sessoesExibicao.length} ${sessoesExibicao.length === 1 ? 'sessão planejada' : 'sessões planejadas'}</span>
    </div>
  `;

  if (sessoesExibicao.length === 0) {
    const emptyPlanner = plannerCard.createEl('div', {
      attr: { class: 'snoopy-meta', style: 'padding: 20px 0; text-align: center; color: var(--text-muted);' },
      text: 'Nenhuma sessão planejada para hoje. Cadastre suas matérias para gerar o cronograma diário!'
    });
  } else {
    const listaSessoesContainer = plannerCard.createEl('div', {
      attr: { style: 'display: flex; flex-direction: column; gap: 8px;' }
    });

    sessoesExibicao.forEach((sessao, sIdx) => {
      const corBorda = coresBordas[sIdx % coresBordas.length];
      const tipoSessao = (sessao.tipo || 'TEORIA').toUpperCase();
      const badgeTipoCor = tipoSessao === 'QUESTÕES'
        ? 'background: rgba(134, 239, 172, 0.15); color: #86efac;'
        : (tipoSessao === 'REVISÃO'
          ? 'background: rgba(248, 113, 113, 0.15); color: #fca5a5;'
          : 'background: rgba(167, 139, 250, 0.15); color: #c4b5fd;');

      const rowSessao = listaSessoesContainer.createEl('div', {
        attr: { style: `display: flex; align-items: center; justify-content: space-between; background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-left: 3px solid ${corBorda}; border-radius: 6px; padding: 10px 14px; gap: 10px;` }
      });

      rowSessao.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; overflow: hidden; flex: 1;">
          <span class="snoopy-micro" style="padding: 2px 6px; border-radius: 4px; font-weight: 700; ${badgeTipoCor}">${tipoSessao}</span>
          <div style="display: flex; flex-direction: column; gap: 2px; overflow: hidden;">
            <span style="font-size: 13px; font-weight: 700; color: var(--text-normal); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${sessao.materia}</span>
            <span class="snoopy-meta" style="font-size: 10.5px;">${sessao.duracaoMin || 50} min programados ${sessao.concluido ? '• Concluído hoje' : '• Pendente'}</span>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
          <button class="snoopy-btn-action btn-foco-sessao-dia" data-materia="${sessao.materia}" style="font-size: 10.5px; padding: 4px 10px; display: inline-flex; align-items: center; gap: 4px;">
            ${getIcon('play', 10)}
            <span>Foco</span>
          </button>
        </div>
      `;

      const btnFocoSessao = rowSessao.querySelector('.btn-foco-sessao-dia');
      if (btnFocoSessao) {
        btnFocoSessao.onclick = () => {
          const discAlvo = disciplinas.find(d => d.nome === sessao.materia) || { nome: sessao.materia };
          if (modais && modais.abrirModalSessao) modais.abrirModalSessao(discAlvo);
        };
      }
    });
  }

  // CARD 3 DA COLUNA ESQUERDA: PRÓXIMAS MATÉRIAS DO CICLO (Aproveitamento total do espaço)
  const proximasCicloCard = leftColPlanner.createEl('div', {
    cls: 'snoopy-card-box',
    attr: { style: 'display: flex; flex-direction: column; gap: 12px; padding: 16px;' }
  });

  const materiasSeguintes = filaCiclo.length > 1
    ? [...filaCiclo.slice(currentIdx + 1), ...filaCiclo.slice(0, currentIdx)].slice(0, 3)
    : [];

  proximasCicloCard.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span class="snoopy-section-title" style="display: inline-flex; align-items: center; gap: 6px;">
        ${getIcon('refresh-cw', 13)}
        <span>PRÓXIMAS DO CICLO • FLUXO CONTÍNUO</span>
      </span>
      <span class="snoopy-meta" style="color: var(--text-muted);">${filaCiclo.length > 1 ? `${materiasSeguintes.length} na sequência` : 'Ciclo unitário'}</span>
    </div>
  `;

  if (materiasSeguintes.length === 0) {
    proximasCicloCard.createEl('div', {
      attr: { class: 'snoopy-meta', style: 'padding: 10px 0; color: var(--text-muted); font-size: 11.5px;' },
      text: 'Ciclo com rotação unitária ativa (1 matéria cadastrada). Adicione novas disciplinas na fila para alternância rotativa contínua.'
    });
  } else {
    const filaListaWrap = proximasCicloCard.createEl('div', {
      attr: { style: 'display: flex; flex-direction: column; gap: 8px;' }
    });
    materiasSeguintes.forEach((m, mIdx) => {
      const mRow = filaListaWrap.createEl('div', {
        attr: { style: 'display: flex; align-items: center; justify-content: space-between; background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-radius: 6px; padding: 8px 12px; gap: 10px;' }
      });
      const posReal = filaCiclo.findIndex(f => f.nome === m.nome);
      mRow.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; flex: 1;">
          <span class="snoopy-micro" style="font-weight: 700; color: var(--text-muted); min-width: 20px;">#${posReal >= 0 ? posReal + 1 : mIdx + 2}</span>
          <div style="display: flex; flex-direction: column; gap: 2px; overflow: hidden;">
            <span style="font-size: 12.5px; font-weight: 700; color: var(--text-normal); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${m.nome}</span>
            <span class="snoopy-meta" style="font-size: 10px;">${m.area || m.categoria || 'Geral'} • ${m.minutos || 0}m de foco</span>
          </div>
        </div>
        <button class="snoopy-btn-action btn-foco-proxima" data-nome="${m.nome}" style="font-size: 10.5px; padding: 4px 8px; display: inline-flex; align-items: center; gap: 3px;">
          ${getIcon('play', 10)}
          <span>Foco</span>
        </button>
      `;
      const bFoco = mRow.querySelector('.btn-foco-proxima');
      if (bFoco) {
        bFoco.onclick = () => {
          if (modais && modais.abrirModalSessao) modais.abrirModalSessao(m);
        };
      }
    });
  }

  // CARD 4 DA COLUNA ESQUERDA: RITMO & METAS SEMANAIS
  const diasAtivosSemana = ultimos7Dias.filter(d => (d.minutos || 0) > 0 || (d.questoes || 0) > 0).length;

  const metasCard = leftColPlanner.createEl('div', {
    cls: 'snoopy-card-box',
    attr: { style: 'display: flex; flex-direction: column; gap: 12px; padding: 16px;' }
  });

  const horasRestantes = Math.max(0, (metaHorasSemanal * 60) - somaMinutos7d);
  const horasRestantesTxt = `${Math.floor(horasRestantes / 60)}h${horasRestantes % 60}m`;
  const diasRestantesSemana = Math.max(1, 7 - now.getDay());
  const mediaDiariaNecessariaMin = Math.round(horasRestantes / diasRestantesSemana);
  const ritmoRecomendadoTxt = mediaDiariaNecessariaMin >= 60
    ? `${Math.floor(mediaDiariaNecessariaMin / 60)}h${mediaDiariaNecessariaMin % 60 ? `${mediaDiariaNecessariaMin % 60}m` : ''}`
    : `${mediaDiariaNecessariaMin}m`;

  metasCard.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span class="snoopy-section-title" style="display: inline-flex; align-items: center; gap: 6px;">
        ${getIcon('target', 13)}
        <span>RITMO & METAS SEMANAIS</span>
      </span>
      <span class="snoopy-meta" style="font-weight: 700; color: ${pctMetaHoras >= 100 ? '#86efac' : 'var(--text-normal)'};">${pctMetaHoras}% concluída</span>
    </div>
    <div style="display: flex; flex-direction: column; gap: 6px;">
      <div style="display: flex; justify-content: space-between; font-size: 11.5px;">
        <span style="color: var(--text-normal); font-weight: 600;">Progresso da Meta: <b>${horas7dTxt}</b> de <b>${metaHorasSemanal}h</b></span>
        <span style="color: var(--text-muted);">${horasRestantes === 0 ? 'Meta batida!' : `Faltam ${horasRestantesTxt}`}</span>
      </div>
      <div class="snoopy-prog-track" style="height: 6px; width: 100%; border-radius: 3px; background: rgba(255,255,255,0.08); overflow: hidden;">
        <div class="snoopy-prog-fill" style="width: ${pctMetaHoras}%; height: 100%; background: ${pctMetaHoras >= 100 ? '#86efac' : 'var(--interactive-accent, #60a5fa)'}; border-radius: 3px;"></div>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2px;">
        <span class="snoopy-meta" style="font-size: 11px;">
          ${horasRestantes > 0 ? `Ritmo recomendado: <b>${ritmoRecomendadoTxt}/dia</b> nos próximos ${diasRestantesSemana} dia(s)` : 'Meta cumprida! Mantenha a constância ativa.'}
        </span>
        <span class="snoopy-micro" style="padding: 2px 6px; border-radius: 4px; background: rgba(96, 165, 250, 0.12); color: #93c5fd; font-weight: 700;">
          ${diasAtivosSemana}/7 dias ativos
        </span>
      </div>
    </div>
  `;

  // COLUNA DIREITA: RETENÇÃO & RITMO SEMANAL (Revisões + Gráficos à Direita)
  const rightColMetrics = coreWorkspaceGrid.createEl('div', {
    attr: { style: 'display: flex; flex-direction: column; gap: 14px;' }
  });

  // CARD 1 DA COLUNA DIREITA: REVISÕES PARA HOJE
  const revCard = rightColMetrics.createEl('div', {
    cls: 'snoopy-card-box',
    attr: { style: 'display: flex; flex-direction: column; gap: 10px; padding: 16px;' }
  });

  const pendentesLabel = revsHoje.length === 0
    ? '0 pendentes'
    : (revsHoje.length === 1 ? '1 pendente' : `${revsHoje.length} pendentes`);

  revCard.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span class="snoopy-section-title" style="display: inline-flex; align-items: center; gap: 6px;">
        ${getIcon('brain', 13)}
        <span>REVISÕES PARA HOJE</span>
      </span>
      <span class="snoopy-meta" style="color: ${revsHoje.length > 0 ? '#fca5a5' : '#86efac'}; font-weight: bold;">${pendentesLabel}</span>
    </div>
  `;

  if (revsHoje.length === 0) {
    const emptyBox = revCard.createEl('div', {
      attr: { class: 'snoopy-meta', style: 'padding: 16px 0; text-align: center; display: flex; align-items: center; justify-content: center; gap: 6px; color: var(--text-muted);' }
    });
    emptyBox.innerHTML = `${getIcon('sparkles', 13)} <span>Nenhuma revisão pendente para hoje. Curva de retenção protegida!</span>`;
  } else {
    const revList = revCard.createEl('div', { attr: { style: 'display: flex; flex-direction: column; gap: 6px; max-height: 140px; overflow-y: auto;' } });
    revsHoje.slice(0, 3).forEach(r => {
      const rItem = revList.createEl('div', {
        attr: { style: 'display: flex; justify-content: space-between; align-items: center; background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-radius: 6px; padding: 6px 10px;' }
      });
      rItem.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px; overflow: hidden;">
          <span class="snoopy-micro" style="padding: 1px 5px; border-radius: 3px; background: rgba(96, 165, 250, 0.2); color: #93c5fd;">${r.intervaloDias || 1}d</span>
          <span style="font-size: 11.5px; font-weight: bold; color: var(--text-normal); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${r.nome}</span>
        </div>
        <button class="snoopy-btn-primary btn-concluir-rev" data-path="${r.materiaPath}" style="font-size: 10px; padding: 3px 8px; display: inline-flex; align-items: center; gap: 4px;">
          ${getIcon('check', 11)}
          <span>Concluir</span>
        </button>
      `;

      const btnRev = rItem.querySelector('.btn-concluir-rev');
      if (btnRev) {
        btnRev.onclick = async () => {
          const proxMap = { 1: 7, 7: 14, 14: 30, 30: 30 };
          const novoIntervalo = proxMap[r.intervaloDias || 1] || 7;
          if (r.intervaloDias === 30) {
            r.status = 'concluida';
          } else {
            const proxD = new Date(now.getTime() + novoIntervalo * 86400000);
            r.proximaRevisao = `${proxD.getFullYear()}-${padTime(proxD.getMonth() + 1)}-${padTime(proxD.getDate())}`;
            r.intervaloDias = novoIntervalo;
            r.ultimaRevisao = todayStr;
          }
          await salvarEstado();
          if (typeof Notice !== 'undefined') new Notice(`Revisão concluída! Próxima em ${novoIntervalo} dias.`);
          onReload();
        };
      }
    });
  }

  // CARD 2 DA COLUNA DIREITA: RITMO SEMANAL & GRÁFICOS INTEGRADOS (Sempre à direita >)
  const chartsBox = rightColMetrics.createEl('div', {
    attr: { style: 'display: flex; flex-direction: column; gap: 14px;' }
  });

  if (graficosSvg && graficosSvg.montarBarraAtividadeCard) {
    graficosSvg.montarBarraAtividadeCard(chartsBox, {
      ultimos7Dias,
      diasAtivosSemana,
      totalMinutosSemana: somaMinutos7d
    });
  }

  if (graficosSvg && graficosSvg.montarDonutCard) {
    graficosSvg.montarDonutCard(chartsBox, { disciplinasFiltradas, totalMinutosGlobal, totalHorasTxt });
  }

  const listaSimulados = paraArrayNativo(estado.simulados);
  let totalQuestoesSim = 0;
  let totalAcertosSim = 0;
  listaSimulados.forEach(s => {
    const qTot = Number(s.questoes) || (Number(s.acertos) + Number(s.erros)) || 0;
    const qAc = Number(s.acertos) || 0;
    totalQuestoesSim += qTot;
    totalAcertosSim += qAc;
  });
  const pctGeralSim = totalQuestoesSim > 0 ? Math.round((totalAcertosSim / totalQuestoesSim) * 100) : pctAcertosGeral;

  if (graficosSvg && graficosSvg.montarAssertividadeProvasCard) {
    graficosSvg.montarAssertividadeProvasCard(chartsBox, {
      simulados: listaSimulados,
      pctGeral: pctGeralSim,
      totalAcertos: totalAcertosSim || totalAcertosGlobal,
      totalQuestoes: totalQuestoesSim || totalQuestoesGlobal
    });
  }

  // 5. TABELA ANALÍTICA DE MATÉRIAS & SIMULADOS (Único bloco inferior, integrando Provas e Cronômetro Contínuo sem poluir a tela)
  const tableSection = container.createEl('div', {
    cls: 'snoopy-card-box',
    attr: { style: 'display: flex; flex-direction: column; gap: 12px; padding: 16px;' }
  });

  if (!estado.simulacaoProva) {
    estado.simulacaoProva = { rodando: false, iniciadaEm: null, acumuladoSeg: 0, tempoLimiteMin: 240 };
  }
  const simState = estado.simulacaoProva;
  const calcularSegundosDecorridos = () => {
    let total = Number(simState.acumuladoSeg) || 0;
    if (simState.rodando && simState.iniciadaEm) {
      total += Math.max(0, Math.floor((Date.now() - simState.iniciadaEm) / 1000));
    }
    return total;
  };
  const formatarRelogio = (segTotal) => {
    const h = Math.floor(segTotal / 3600);
    const m = Math.floor((segTotal % 3600) / 60);
    const s = segTotal % 60;
    return `${padTime(h)}:${padTime(m)}:${padTime(s)}`;
  };

  const segAtuais = calcularSegundosDecorridos();
  const minDecorridos = Math.max(1, Math.round(segAtuais / 60));
  const areaPreSelecionada = categoriaFiltroAtiva !== 'Todas'
    ? categoriaFiltroAtiva
    : (disciplinas[0] ? (disciplinas[0].area || 'Programação') : 'Programação');

  tableSection.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="snoopy-section-title" style="display: inline-flex; align-items: center; gap: 6px;">
          ${getIcon('target', 14)}
          <span>TABELA DE MATÉRIAS & SIMULADOS</span>
        </span>
        <span class="snoopy-meta">${disciplinasFiltradas.length} ${disciplinasFiltradas.length === 1 ? 'matéria' : 'matérias'}${simulados.length > 0 ? ` • ${simulados.length} ${simulados.length === 1 ? 'prova' : 'provas'}` : ''}</span>
      </div>

      <!-- Cronômetro Contínuo Discreto no Cabeçalho da Tabela (Para Simulação Real de Prova sem pausa) -->
      <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
        <div style="display: inline-flex; align-items: center; gap: 7px; background: var(--background-secondary-alt); border: 1px solid ${simState.rodando ? 'var(--interactive-accent, #60a5fa)' : 'var(--background-modifier-border)'}; border-radius: 6px; padding: 4px 10px;" title="Relógio contínuo para simulação real de prova (sem pausas de Pomodoro)">
          <span style="display: inline-flex; align-items: center; gap: 4px; color: ${simState.rodando ? 'var(--interactive-accent, #60a5fa)' : 'var(--text-muted)'}; font-size: 11px; font-weight: 600;">
            ${getIcon('clock', 12)}
            <span>Prova:</span>
          </span>
          <span id="prova-timer-display" style="font-family: var(--font-monospace, monospace); font-size: 13px; font-weight: 800; color: ${simState.rodando ? '#86efac' : 'var(--text-normal)'};">
            ${formatarRelogio(segAtuais)}
          </span>
          <button id="btn-prova-timer-toggle" class="${simState.rodando ? 'snoopy-btn-action' : 'snoopy-btn-primary'} snoopy-btn-sm" style="font-size: 10.5px; padding: 3px 8px; display: inline-flex; align-items: center; gap: 4px;">
            ${getIcon(simState.rodando ? 'pause' : 'play', 9)}
            <span>${simState.rodando ? 'Pausar' : 'Simular Prova'}</span>
          </button>
          ${segAtuais > 0 ? `<button id="btn-prova-timer-reset" class="snoopy-btn-action snoopy-btn-sm" style="font-size: 10px; padding: 3px 6px;" title="Zerar relógio">Zerar</button>` : ''}
        </div>

        <button id="btn-add-materia-tabela" class="snoopy-btn-action snoopy-btn-sm" style="display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 10px;" title="Abrir modal completo de cadastro">
          ${getIcon('plus', 12)}
          <span>Modal Completo</span>
        </button>
      </div>
    </div>

    <!-- Painel de Ações Rápidas em Tabs Limpas (Zero poluição visual, apenas 1 linha ativa de cada vez) -->
    <div class="snoopy-quick-actions-box">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; gap: 6px; align-items: center;">
          <button id="tab-action-mat" class="snoopy-tab-pill-btn active" type="button">
            ${getIcon('plus', 11)}
            <span>Nova Disciplina</span>
          </button>
          <button id="tab-action-prova" class="snoopy-tab-pill-btn" type="button">
            ${getIcon('target', 11)}
            <span>Registrar Prova / Simulado</span>
          </button>
        </div>
        <span class="snoopy-micro" style="color: var(--text-muted); font-size: 11px;">Entrelace automático: Ciclo • Planner de Hoje • Revisão Espaçada</span>
      </div>

      <!-- Tab 1: Cadastro Rápido de Matéria -->
      <div id="panel-quick-mat" style="display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding-top: 4px;">
        <input id="quick-add-mat-nome" type="text" placeholder="Nome da disciplina (ex: Arquitetura de Software)..." style="flex: 2; min-width: 180px; height: 32px; background: var(--background-primary); border: 1px solid var(--background-modifier-border); border-radius: 6px; padding: 0 10px; font-size: 11.5px; color: var(--text-normal); outline: none;">
        <input id="quick-add-mat-area" type="text" value="${areaPreSelecionada}" placeholder="Área" style="flex: 1; min-width: 90px; max-width: 130px; height: 32px; background: var(--background-primary); border: 1px solid var(--background-modifier-border); border-radius: 6px; padding: 0 10px; font-size: 11.5px; color: var(--text-normal); outline: none;">
        <label style="display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text-muted); cursor: pointer; user-select: none; padding: 4px 8px; border-radius: 4px; background: rgba(255,255,255,0.03); border: 1px solid var(--background-modifier-border);" title="Gera tarefa na nota diária vinculada à Home">
          <input id="quick-add-mat-task" type="checkbox" checked style="cursor: pointer;">
          <span>+ Home & Planner</span>
        </label>
        <button id="btn-quick-add-mat" class="snoopy-btn-primary snoopy-btn-sm" style="height: 32px; padding: 0 14px; font-size: 11px; display: inline-flex; align-items: center; gap: 5px;">
          ${getIcon('plus', 11)}
          <span>Cadastrar Matéria</span>
        </button>
      </div>

      <!-- Tab 2: Registro Rápido de Prova / Simulado -->
      <div id="panel-quick-prova" style="display: none; align-items: center; flex-wrap: wrap; gap: 8px; padding-top: 4px;">
        <input id="quick-prova-titulo" type="text" placeholder="Nome da Prova / Simulado..." style="flex: 1.6; min-width: 150px; height: 32px; background: var(--background-primary); border: 1px solid var(--background-modifier-border); border-radius: 6px; padding: 0 10px; font-size: 11.5px; color: var(--text-normal); outline: none;">
        <select id="quick-prova-mat" style="flex: 1; min-width: 130px; height: 32px; background: var(--background-primary); border: 1px solid var(--background-modifier-border); border-radius: 6px; padding: 0 8px; font-size: 11.5px; color: var(--text-normal); outline: none;">
          ${disciplinas.length > 0
            ? disciplinas.map(d => `<option value="${d.nome}">${d.nome}</option>`).join('')
            : '<option value="Geral">Geral</option>'}
        </select>
        <div style="display: inline-flex; align-items: center; gap: 6px; background: var(--background-primary); border: 1px solid var(--background-modifier-border); border-radius: 6px; padding: 3px 8px; height: 32px;">
          <span class="snoopy-micro" style="color: var(--text-muted);">Questões:</span>
          <input id="quick-prova-questoes" type="number" min="1" value="45" title="Total de questões" style="width: 44px; background: transparent; border: none; font-family: var(--font-monospace, monospace); font-size: 11.5px; color: var(--text-normal); font-weight: 700; text-align: center; outline: none;">
          <span style="color: var(--background-modifier-border);">|</span>
          <span class="snoopy-micro" style="color: #86efac;">Acertos:</span>
          <input id="quick-prova-acertos" type="number" min="0" value="36" title="Total de acertos" style="width: 40px; background: transparent; border: none; font-family: var(--font-monospace, monospace); font-size: 11.5px; color: #86efac; font-weight: 700; text-align: center; outline: none;">
          <span style="color: var(--background-modifier-border);">|</span>
          <span class="snoopy-micro" style="color: #fca5a5;">Erros:</span>
          <input id="quick-prova-erros" type="number" min="0" value="9" title="Total de erros" style="width: 40px; background: transparent; border: none; font-family: var(--font-monospace, monospace); font-size: 11.5px; color: #fca5a5; font-weight: 700; text-align: center; outline: none;">
          <span style="color: var(--background-modifier-border);">|</span>
          <span class="snoopy-micro" style="color: var(--text-muted);">Min:</span>
          <input id="quick-prova-tempo" type="number" min="1" value="${segAtuais > 0 ? minDecorridos : 180}" title="Tempo para fazer a prova (em minutos)" style="width: 44px; background: transparent; border: none; font-family: var(--font-monospace, monospace); font-size: 11.5px; color: var(--text-normal); font-weight: 700; text-align: center; outline: none;">
        </div>
        <button id="btn-quick-prova-save" class="snoopy-btn-action snoopy-btn-sm" style="height: 32px; padding: 0 14px; font-size: 11px; display: inline-flex; align-items: center; gap: 5px;">
          ${getIcon('check', 11)}
          <span>Lançar Prova</span>
        </button>
      </div>
    </div>
  `;

  // Alternância suave de tabs da barra de ações rápidas
  const tabActMat = tableSection.querySelector('#tab-action-mat');
  const tabActProva = tableSection.querySelector('#tab-action-prova');
  const panelMat = tableSection.querySelector('#panel-quick-mat');
  const panelProva = tableSection.querySelector('#panel-quick-prova');

  if (tabActMat && tabActProva && panelMat && panelProva) {
    tabActMat.onclick = () => {
      tabActMat.classList.add('active');
      tabActProva.classList.remove('active');
      panelMat.style.display = 'flex';
      panelProva.style.display = 'none';
    };
    tabActProva.onclick = () => {
      tabActProva.classList.add('active');
      tabActMat.classList.remove('active');
      panelMat.style.display = 'none';
      panelProva.style.display = 'flex';
    };
  }

  // Atualização em tempo real do cronômetro contínuo
  if (typeof window !== 'undefined') {
    if (window.__snoopyProvaTimerId) {
      clearInterval(window.__snoopyProvaTimerId);
      window.__snoopyProvaTimerId = null;
    }
    if (simState.rodando) {
      window.__snoopyProvaTimerId = setInterval(() => {
        const disp = tableSection.querySelector('#prova-timer-display');
        if (!disp) {
          clearInterval(window.__snoopyProvaTimerId);
          window.__snoopyProvaTimerId = null;
          return;
        }
        const sNow = calcularSegundosDecorridos();
        disp.textContent = formatarRelogio(sNow);
        const inpT = tableSection.querySelector('#quick-prova-tempo');
        if (inpT && sNow >= 60) inpT.value = String(Math.round(sNow / 60));
      }, 1000);
    }
  }

  const btnTimerToggle = tableSection.querySelector('#btn-prova-timer-toggle');
  if (btnTimerToggle) {
    btnTimerToggle.onclick = async () => {
      if (simState.rodando) {
        simState.acumuladoSeg = calcularSegundosDecorridos();
        simState.iniciadaEm = null;
        simState.rodando = false;
      } else {
        simState.iniciadaEm = Date.now();
        simState.rodando = true;
      }
      await salvarEstado();
      onReload();
    };
  }

  const btnTimerReset = tableSection.querySelector('#btn-prova-timer-reset');
  if (btnTimerReset) {
    btnTimerReset.onclick = async () => {
      simState.acumuladoSeg = 0;
      simState.iniciadaEm = null;
      simState.rodando = false;
      await salvarEstado();
      onReload();
    };
  }

  const inpQuestoesProva = tableSection.querySelector('#quick-prova-questoes');
  const inpAcertosProva = tableSection.querySelector('#quick-prova-acertos');
  const inpErrosProva = tableSection.querySelector('#quick-prova-erros');
  const recalcularErrosProva = () => {
    if (!inpQuestoesProva || !inpAcertosProva || !inpErrosProva) return;
    const q = parseInt(inpQuestoesProva.value, 10) || 0;
    const a = parseInt(inpAcertosProva.value, 10) || 0;
    inpErrosProva.value = String(Math.max(0, q - a));
  };
  if (inpQuestoesProva) inpQuestoesProva.oninput = recalcularErrosProva;
  if (inpAcertosProva) inpAcertosProva.oninput = recalcularErrosProva;

  const btnSaveProva = tableSection.querySelector('#btn-quick-prova-save');
  if (btnSaveProva) {
    btnSaveProva.onclick = async () => {
      const inpTitulo = tableSection.querySelector('#quick-prova-titulo');
      const selMat = tableSection.querySelector('#quick-prova-mat');
      const inpTempo = tableSection.querySelector('#quick-prova-tempo');

      const titulo = (inpTitulo && inpTitulo.value.trim()) || `Simulado ${todayStr}`;
      const matNome = (selMat && selMat.value) || (disciplinas[0]?.nome || 'Geral');
      const questoes = Math.max(1, parseInt(inpQuestoesProva?.value || '0', 10) || 0);
      const acertos = Math.max(0, parseInt(inpAcertosProva?.value || '0', 10) || 0);
      const erros = Math.max(0, parseInt(inpErrosProva?.value || String(Math.max(0, questoes - acertos)), 10) || 0);
      const tempoMin = Math.max(1, parseInt(inpTempo?.value || '60', 10) || 60);
      const pct = Math.round((acertos / questoes) * 100);

      const discRef = disciplinas.find(d => d.nome === matNome);
      const areaProva = discRef ? (discRef.area || discRef.categoria || 'Geral') : 'Geral';

      if (!Array.isArray(estado.simulados)) estado.simulados = [];
      estado.simulados.unshift({
        id: `sim-${Date.now()}`,
        data: todayStr,
        titulo,
        materia: matNome,
        area: areaProva,
        questoes,
        acertos,
        erros,
        tempoMin,
        pct
      });

      if (!estado.historicoDiario) estado.historicoDiario = {};
      if (!estado.historicoDiario[todayStr]) {
        estado.historicoDiario[todayStr] = { minutosFoco: 0, questoesFeitas: 0, questoesAcertos: 0 };
      }
      estado.historicoDiario[todayStr].minutosFoco += tempoMin;
      estado.historicoDiario[todayStr].questoesFeitas += questoes;
      estado.historicoDiario[todayStr].questoesAcertos += acertos;

      simState.acumuladoSeg = 0;
      simState.iniciadaEm = null;
      simState.rodando = false;

      await salvarEstado();

      if (discRef && discRef.path && app && app.vault && app.vault.getAbstractFileByPath) {
        const file = app.vault.getAbstractFileByPath(discRef.path);
        if (file && app.vault.read && app.vault.modify) {
          const raw = await app.vault.read(file);
          let updated = raw;
          const nMin = (Number(discRef.minutos) || 0) + tempoMin;
          const nFeitas = (Number(discRef.feitas) || 0) + questoes;
          const nAcertos = (Number(discRef.acertos) || 0) + acertos;

          if (/minutos_foco:\s*\d+/.test(updated)) updated = updated.replace(/minutos_foco:\s*\d+/, `minutos_foco: ${nMin}`);
          if (/questoes_feitas:\s*\d+/.test(updated)) updated = updated.replace(/questoes_feitas:\s*\d+/, `questoes_feitas: ${nFeitas}`);
          if (/questoes_acertos:\s*\d+/.test(updated)) updated = updated.replace(/questoes_acertos:\s*\d+/, `questoes_acertos: ${nAcertos}`);
          await app.vault.modify(file, updated);
        }
      }

      if (typeof Notice !== 'undefined') {
        new Notice(`Prova "${titulo}" registrada: ${acertos}/${questoes} (${pct}%) em ${tempoMin}m!`);
      }
      onReload();
    };
  }

  const btnAddTabela = tableSection.querySelector('#btn-add-materia-tabela');
  if (btnAddTabela && modais && modais.abrirModalNovaMateria) {
    btnAddTabela.onclick = () => {
      const areaPadrao = categoriaFiltroAtiva !== 'Todas' ? categoriaFiltroAtiva : '';
      modais.abrirModalNovaMateria(areaPadrao);
    };
  }

  const btnQuickAdd = tableSection.querySelector('#btn-quick-add-mat');
  const inputQuickNome = tableSection.querySelector('#quick-add-mat-nome');
  const inputQuickArea = tableSection.querySelector('#quick-add-mat-area');
  const chkQuickTask = tableSection.querySelector('#quick-add-mat-task');

  const executarQuickAdd = async () => {
    if (!inputQuickNome || !app || !app.vault) return;
    const rawNome = inputQuickNome.value.trim();
    if (!rawNome) return;
    const areaVal = (inputQuickArea && inputQuickArea.value.trim()) || areaPreSelecionada || 'Geral';
    const criarTaskHome = chkQuickTask ? chkQuickTask.checked : true;

    const cleanNome = rawNome.replace(/[\\/:*?"<>|]/g, '-').trim();
    const filePath = `03_Estudos/${cleanNome}.md`;

    if (app.vault.getAbstractFileByPath && !app.vault.getAbstractFileByPath("03_Estudos") && app.vault.createFolder) {
      await app.vault.createFolder("03_Estudos").catch(() => {});
    }

    if (app.vault.getAbstractFileByPath && !app.vault.getAbstractFileByPath(filePath) && app.vault.create) {
      const mdContent = `---\ntitle: "${cleanNome}"\narea: "${areaVal}"\ncategoria: "${areaVal}"\ndisciplina: "${areaVal}"\nstatus: "Ativo"\nminutos_foco: 0\nquestoes_feitas: 0\nquestoes_acertos: 0\nprovas: []\ntags:\n  - estudo\n---\n\n# ${cleanNome}\n\n> **Área:** \`${areaVal}\` | **Status:** \`Ativo\`\n\n## Provas, Simulados & PDFs\n- Nenhum PDF anexado ainda.\n\n## Conteúdo & Anotações\n- \n`;
      await app.vault.create(filePath, mdContent);
    }

    if (!Array.isArray(estado.cicloOrdem)) estado.cicloOrdem = [];
    if (!estado.cicloOrdem.includes(cleanNome)) {
      estado.cicloOrdem.push(cleanNome);
    }

    // Vinculação total: Adiciona a nova matéria ao Planner de hoje e programa a 1ª revisão
    if (criarTaskHome) {
      if (!estado.planner) estado.planner = {};
      if (!Array.isArray(estado.planner[todayStr])) estado.planner[todayStr] = [];
      estado.planner[todayStr].push({
        materia: cleanNome,
        tipo: 'TEORIA',
        duracaoMin: 50,
        concluido: false
      });

      if (!Array.isArray(estado.revisoes)) estado.revisoes = [];
      const jaExisteRev = estado.revisoes.some(r => r.nome === cleanNome && r.status === 'programada');
      if (!jaExisteRev) {
        const d1 = new Date(now.getTime() + 86400000);
        const d1Str = `${d1.getFullYear()}-${padTime(d1.getMonth() + 1)}-${padTime(d1.getDate())}`;
        estado.revisoes.push({
          id: `rev-${Date.now()}`,
          nome: cleanNome,
          materiaPath: filePath,
          intervaloDias: 1,
          proximaRevisao: d1Str,
          status: 'programada',
          criadaEm: todayStr
        });
      }
    }
    await salvarEstado();

    if (criarTaskHome && app.vault.getAbstractFileByPath) {
      const dailyFolder = "01_Inbox/Diário";
      const dailyPath = `${dailyFolder}/${todayStr}.md`;
      const taskLine = `- [ ] Estudar [[03_Estudos/${cleanNome}.md|${cleanNome}]] 📅 ${todayStr} 🍅 2 #estudo`;

      if (!app.vault.getAbstractFileByPath(dailyFolder) && app.vault.createFolder) {
        await app.vault.createFolder(dailyFolder).catch(() => {});
      }
      const dailyFile = app.vault.getAbstractFileByPath(dailyPath);
      if (!dailyFile && app.vault.create) {
        await app.vault.create(dailyPath, `# Diário - ${todayStr}\n\n## Tarefas\n${taskLine}\n\n## Notas do Dia\n`);
      } else if (dailyFile && app.vault.read && app.vault.modify) {
        const rawDaily = await app.vault.read(dailyFile);
        const regexTarefas = /(^##\s+.*Tarefas.*$)/m;
        const match = rawDaily.match(regexTarefas);
        const updatedDaily = match
          ? rawDaily.replace(match[0], `${match[0]}\n${taskLine}`)
          : `${rawDaily}\n\n## Tarefas\n${taskLine}\n`;
        await app.vault.modify(dailyFile, updatedDaily);
      }
    }

    if (typeof Notice !== 'undefined') {
      new Notice(`Matéria "${cleanNome}" cadastrada${criarTaskHome ? ' e vinculada às tarefas de hoje na Home' : ''}!`);
    }
    onReload();
  };

  if (btnQuickAdd) btnQuickAdd.onclick = executarQuickAdd;
  if (inputQuickNome) {
    inputQuickNome.onkeydown = (e) => {
      if (e.key === 'Enter') executarQuickAdd();
    };
  }

  // Chips compactos das últimas provas realizadas (apenas quando houver provas cadastradas)
  if (simulados.length > 0) {
    const simRow = tableSection.createEl('div', {
      attr: { style: 'display: flex; align-items: center; gap: 6px; flex-wrap: wrap;' }
    });
    simRow.innerHTML = `<span class="snoopy-micro" style="color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Últimas Provas:</span>`;
    simulados.slice(0, 4).forEach((sim, sIdx) => {
      const qTot = Number(sim.questoes) || 0;
      const qAc = Number(sim.acertos) || 0;
      const qEr = sim.erros !== undefined ? Number(sim.erros) : Math.max(0, qTot - qAc);
      const tMin = Number(sim.tempoMin) || 0;
      const chip = simRow.createEl('span', {
        attr: { style: 'display: inline-flex; align-items: center; gap: 6px; padding: 3px 8px; border-radius: 4px; background: var(--background-secondary); border: 1px solid var(--background-modifier-border); font-size: 10.5px;' }
      });
      chip.innerHTML = `
        <b style="color: var(--text-normal);">${sim.titulo}</b>
        <span style="color: #86efac;">${qAc}C</span>/<span style="color: #fca5a5;">${qEr}E</span>
        <span class="snoopy-micro" style="color: var(--text-muted);">(${qTot}q • ${tMin}m)</span>
        <span class="btn-del-simulado" data-idx="${sIdx}" style="cursor: pointer; color: var(--text-muted);" title="Remover registro">×</span>
      `;
      const btnDelSim = chip.querySelector('.btn-del-simulado');
      if (btnDelSim) {
        btnDelSim.onclick = async () => {
          estado.simulados.splice(sIdx, 1);
          await salvarEstado();
          onReload();
        };
      }
    });
  }

  if (disciplinasFiltradas.length === 0) {
    tableSection.createEl('div', {
      attr: { class: 'snoopy-meta', style: 'text-align: center; padding: 24px 0;' },
      text: 'Nenhuma matéria encontrada nesta área. Utilize a barra rápida acima para cadastrar!'
    });
    return;
  }

  const tableWrapper = tableSection.createEl('div', { attr: { style: 'overflow-x: auto;' } });
  const tableEl = tableWrapper.createEl('table', {
    cls: 'snoopy-table',
    attr: { style: 'width: 100%; border-collapse: separate; border-spacing: 0; font-size: 12.5px; text-align: left;' }
  });

  tableEl.innerHTML = `
    <thead>
      <tr>
        <th style="width: 28%; vertical-align: middle;">Disciplina</th>
        <th style="width: 14%; vertical-align: middle;">Ciclo & Área</th>
        <th style="width: 16%; vertical-align: middle;">Revisão Espaçada</th>
        <th style="width: 14%; vertical-align: middle;">Foco & Planner</th>
        <th style="width: 16%; vertical-align: middle;">Assertividade</th>
        <th style="width: 12%; text-align: right; vertical-align: middle;">Ações</th>
      </tr>
    </thead>
    <tbody>
      ${disciplinasFiltradas.map((d, dIdx) => {
        const hTxt = `${Math.floor((d.minutos || 0) / 60)}h${(d.minutos || 0) % 60}m`;
        let posCiclo = -1;
        for (let cIdx = 0; cIdx < filaCiclo.length; cIdx++) {
          if (filaCiclo[cIdx] && filaCiclo[cIdx].nome === d.nome) {
            posCiclo = cIdx;
            break;
          }
        }
        const isDaVez = posCiclo === currentIdx;
        const cicloBadge = posCiclo >= 0
          ? `<span class="snoopy-micro" style="padding: 1px 6px; border-radius: 4px; font-weight: 700; ${isDaVez ? 'background: rgba(96, 165, 250, 0.2); color: #93c5fd; border: 1px solid rgba(96, 165, 250, 0.35);' : 'background: rgba(255,255,255,0.05); color: var(--text-muted);'}">${isDaVez ? `#${posCiclo + 1} DA VEZ` : `#${posCiclo + 1} no Ciclo`}</span>`
          : '';

        const revMat = paraArrayNativo(estado.revisoes).find(r =>
          r && r.status === 'programada' &&
          (r.nome === d.nome || r.materiaPath === d.path || (d.file && r.nome === d.file.name))
        );
        let revBadge = '';
        if (revMat) {
          const vencida = revMat.proximaRevisao <= todayStr;
          revBadge = `<span class="snoopy-micro" style="padding: 2px 7px; border-radius: 4px; font-weight: 600; background: ${vencida ? 'rgba(248, 113, 113, 0.16)' : 'rgba(134, 239, 172, 0.12)'}; color: ${vencida ? '#fca5a5' : '#86efac'}; border: 1px solid ${vencida ? 'rgba(248, 113, 113, 0.3)' : 'rgba(134, 239, 172, 0.25)'};" title="Próxima revisão: ${revMat.proximaRevisao}">${vencida ? 'Rev: Hoje' : `Rev: ${revMat.intervaloDias || 1}d`}</span>`;
        }

        return `
          <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.06); transition: background 0.12s ease;">
            <td style="padding: 12px 14px; vertical-align: middle;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="btn-open-nota-mat" data-path="${d.path || `03_Estudos/${d.nome}.md`}" style="font-size: 13.5px; font-weight: 700; color: var(--text-normal); cursor: pointer;" title="Abrir nota da matéria">${d.nome}</span>
              </div>
            </td>
            <td style="padding: 12px 14px; vertical-align: middle; white-space: nowrap;">
              <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-start;">
                <span style="font-size: 10.5px; padding: 2px 7px; border-radius: 4px; background: rgba(255,255,255,0.06); color: var(--text-normal); border: 1px solid var(--background-modifier-border); display: inline-block;">
                  ${d.area || d.categoria || 'Geral'}
                </span>
                ${cicloBadge}
              </div>
            </td>
            <td style="padding: 12px 14px; vertical-align: middle; white-space: nowrap;">
              <div style="display: flex; align-items: center; gap: 6px;">
                ${revBadge || '<span class="snoopy-micro" style="color: var(--text-muted); opacity: 0.7;">Curva em dia</span>'}
              </div>
            </td>
            <td style="padding: 12px 14px; vertical-align: middle; color: var(--text-normal); white-space: nowrap;">
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <span style="font-weight: 700; font-size: 12.5px;">${hTxt}</span>
                <span class="snoopy-micro" style="color: var(--text-muted);">${d.feitas ? `${d.feitas}q feitas` : 'Sem questões'}</span>
              </div>
            </td>
            <td style="padding: 12px 14px; vertical-align: middle; white-space: nowrap;">
              <div style="display: flex; flex-direction: column; gap: 4px; width: 110px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-weight: 800; color: ${(d.pct || 0) >= 80 ? '#86efac' : 'var(--text-normal)'}; font-size: 12px;">${d.pct || 0}%</span>
                  <span class="snoopy-micro" style="color: var(--text-muted);">${d.acertos || 0}/${d.feitas || 0}</span>
                </div>
                <div class="snoopy-prog-track" style="height: 5px; width: 100%; border-radius: 3px; overflow: hidden; background: rgba(255, 255, 255, 0.08);">
                  <div class="snoopy-prog-fill" style="width: ${d.pct || 0}%; background: ${(d.pct || 0) >= 80 ? '#86efac' : (d.pct || 0) >= 60 ? 'var(--interactive-accent, #60a5fa)' : '#fca5a5'}; height: 100%;"></div>
                </div>
              </div>
            </td>
            <td style="padding: 12px 14px; text-align: right; vertical-align: middle; white-space: nowrap;">
              <div style="display: flex; justify-content: flex-end; align-items: center; gap: 6px;">
                <button class="snoopy-btn-action btn-tarefa-mat" data-idx="${dIdx}" style="font-size: 11px; padding: 4px 8px; display: inline-flex; align-items: center; gap: 4px;" title="Agendar no Planner e na Home">
                  ${getIcon('calendar-plus', 11)}
                  <span>Tarefa</span>
                </button>
                <button class="snoopy-btn-primary btn-foco-mat" data-idx="${dIdx}" style="font-size: 11px; padding: 4px 10px; display: inline-flex; align-items: center; gap: 4px;" title="Iniciar sessão de foco">
                  ${getIcon('play', 10)}
                  <span>Foco</span>
                </button>
                <button class="snoopy-btn-action btn-menu-disc" data-idx="${dIdx}" style="padding: 3px 6px; display: inline-flex; align-items: center;" title="Editar matéria e materiais">
                  ${getIcon('more-vertical', 13)}
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('')}
    </tbody>
  `;

  tableEl.querySelectorAll('.btn-open-nota-mat').forEach(span => {
    span.onclick = () => {
      const targetPath = getDataAttr(span, 'path');
      if (app && app.workspace && app.workspace.openLinkText && targetPath) {
        app.workspace.openLinkText(targetPath, "", false);
      }
    };
  });

  tableEl.querySelectorAll('.btn-tarefa-mat').forEach(btn => {
    const idx = parseInt(getDataAttr(btn, 'idx'), 10);
    btn.onclick = () => {
      if (modais && modais.abrirModalCriarTarefaMateria && disciplinasFiltradas[idx]) {
        modais.abrirModalCriarTarefaMateria(disciplinasFiltradas[idx]);
      }
    };
  });

  tableEl.querySelectorAll('.btn-foco-mat').forEach(btn => {
    const idx = parseInt(getDataAttr(btn, 'idx'), 10);
    btn.onclick = () => {
      if (modais && modais.abrirModalSessao && disciplinasFiltradas[idx]) {
        modais.abrirModalSessao(disciplinasFiltradas[idx]);
      }
    };
  });

  tableEl.querySelectorAll('.btn-menu-disc').forEach(btn => {
    const idx = parseInt(getDataAttr(btn, 'idx'), 10);
    btn.onclick = () => {
      if (modais && modais.abrirModalEditarMateria && disciplinasFiltradas[idx]) {
        modais.abrirModalEditarMateria(disciplinasFiltradas[idx]);
      }
    };
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderAbaPainel };
}

return { renderAbaPainel };

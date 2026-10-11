/**
 * Snoopy Vault - Submódulo: Aba Painel de Controle (Estudos)
 * Apresenta a visão geral analítica, filtros por área, gráficos SVG de horas e 7D,
 * radar com a matéria da vez e revisões do dia, além da tabela detalhada de matérias.
 *
 * @module subdashboards/estudos/abas/aba_painel
 */

/**
 * Renderiza a aba Painel de Controle dentro do container fornecido.
 *
 * @param {HTMLElement} rootContainer - Elemento onde a aba será renderizada.
 * @param {object} ctx - Contexto compartilhado com dados e utilitários.
 * @param {object} ctx.app - Instância do Obsidian App.
 * @param {object} [ctx.dv] - Instância da Dataview API.
 * @param {object} ctx.estado - Estado atual de estudos em memória.
 * @param {Array<object>} ctx.disciplinas - Lista completa de disciplinas processadas.
 * @param {object} ctx.graficosSvg - Módulo de geração de gráficos SVG.
 * @param {object} ctx.modais - Instância do gerenciador de modais de estudos.
 * @param {string} [ctx.categoriaFiltroAtiva='Todas'] - Filtro de área selecionado atualmente.
 * @param {Function} [ctx.setCategoriaFiltroAtiva] - Callback para alternar o filtro de área.
 * @param {Function} [ctx.obterFilaDoCiclo] - Função para obter matérias na ordem do ciclo.
 * @param {Function} ctx.salvarEstado - Função assíncrona para persistir o estado.
 * @param {Function} ctx.onReload - Callback para recarregar a visualização.
 */
function renderAbaPainel(rootContainer, ctx) {
  const {
    app,
    dv,
    estado,
    disciplinas = [],
    graficosSvg,
    modais,
    categoriaFiltroAtiva = 'Todas',
    setCategoriaFiltroAtiva = () => {},
    obterFilaDoCiclo = (d) => d,
    salvarEstado = async () => {},
    onReload = () => {}
  } = ctx;

  const container = rootContainer.createEl('div', {
    attr: { style: 'display: flex; flex-direction: column; gap: 18px;' }
  });

  const now = new Date();
  const padTime = (n) => String(n).padStart(2, '0');
  const todayStr = `${now.getFullYear()}-${padTime(now.getMonth() + 1)}-${padTime(now.getDate())}`;

  // Coleta lista única de áreas para os filtros
  const categoriasSet = new Set(['Todas']);
  disciplinas.forEach(d => {
    if (d.area || d.categoria) categoriasSet.add(d.area || d.categoria);
  });
  ['Programação', 'ENEM', 'Concurso', 'Economia'].forEach(c => categoriasSet.add(c));
  const categoriasLista = Array.from(categoriasSet);

  // FILTRO HORIZONTAL POR ÁREA
  const filterRow = container.createEl('div', {
    attr: { style: 'display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;' }
  });

  const filterLeft = filterRow.createEl('div', {
    attr: { style: 'display: flex; align-items: center; gap: 8px; flex-wrap: wrap;' }
  });
  filterLeft.createEl('span', {
    attr: { class: 'snoopy-meta', style: 'font-size: 10.5px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;' },
    text: 'Filtrar por Área:'
  });

  const pillsContainer = filterLeft.createEl('div', { attr: { style: 'display: flex; gap: 6px; flex-wrap: wrap;' } });
  categoriasLista.forEach(cat => {
    const isAtiva = categoriaFiltroAtiva === cat;
    const pill = pillsContainer.createEl('button', {
      cls: `snoopy-btn-mode ${isAtiva ? 'active' : ''}`,
      attr: { style: `font-size: 10.5px; padding: 3px 10px; border-radius: 4px; ${isAtiva ? 'background: var(--text-normal); color: var(--background-primary); font-weight: bold;' : ''}` },
      text: cat
    });
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

  const totalHorasTxt = `${Math.floor(totalMinutosGlobal / 60)}h${totalMinutosGlobal % 60}m`;
  const pctAcertosGeral = totalQuestoesGlobal > 0 ? Math.round((totalAcertosGlobal / totalQuestoesGlobal) * 100) : 0;

  // CÁLCULO DOS ÚLTIMOS 7 DIAS
  const ultimos7Dias = [];
  const diasSemanaNomesCurtos = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  let somaMinutos7d = 0;

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dStr = `${d.getFullYear()}-${padTime(d.getMonth() + 1)}-${padTime(d.getDate())}`;
    const isHoje = dStr === todayStr;

    let minDia = 0;
    let questDia = 0;

    if (estado.historicoDiario && estado.historicoDiario[dStr]) {
      minDia += Number(estado.historicoDiario[dStr].minutosFoco) || 0;
      questDia += Number(estado.historicoDiario[dStr].questoesFeitas) || 0;
    }

    if (dv && dv.page) {
      const dailyPage = dv.page(`"01_Inbox/Diário/${dStr}"`);
      if (dailyPage && dailyPage.pomodoros) {
        const pMin = Number(dailyPage.pomodoros) * 25;
        if (pMin > minDia) minDia = pMin;
      }
    }

    somaMinutos7d += minDia;

    ultimos7Dias.push({
      dataStr: dStr,
      diaSemana: diasSemanaNomesCurtos[d.getDay()],
      diaMes: `${padTime(d.getDate())}/${padTime(d.getMonth() + 1)}`,
      minutos: minDia,
      questoes: questDia,
      isHoje
    });
  }

  const mediaMinutosDia = Math.round(somaMinutos7d / 7);
  const mediaHorasTxt = mediaMinutosDia >= 60 ? `${Math.floor(mediaMinutosDia / 60)}h${mediaMinutosDia % 60}m` : `${mediaMinutosDia}m`;
  const maxMinutosPlot = Math.max(60, ...ultimos7Dias.map(p => p.minutos)) * 1.15;

  // FAIXA SUPERIOR: DONUT POR MATÉRIA & LINHA DE 7 DIAS (50/50)
  const topControlGrid = container.createEl('div', {
    cls: 'snoopy-showcase-grid',
    attr: { style: 'margin-bottom: 0;' }
  });

  if (graficosSvg && graficosSvg.montarDonutCard && graficosSvg.montarLineChartCard) {
    graficosSvg.montarDonutCard(topControlGrid, { disciplinasFiltradas, totalMinutosGlobal, totalHorasTxt });
    graficosSvg.montarLineChartCard(topControlGrid, { ultimos7Dias, mediaHorasTxt, maxMinutosPlot, mediaMinutosDia });
  }

  // FAIXA DE KPIS: 6 CARDS EM GRADE HOMOGÊNEA
  const kpiGrid = container.createEl('div', {
    attr: { style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px;' }
  });

  const kpis = [
    { label: 'TEMPO DE FOCO', val: totalHorasTxt, sub: 'Tempo líquido real', cor: 'var(--text-normal)' },
    { label: 'QUESTÕES', val: totalQuestoesGlobal, sub: 'Total resolvidas', cor: 'var(--text-normal)' },
    { label: 'ACERTOS', val: totalAcertosGlobal, sub: 'Corretas', cor: '#86efac' },
    { label: 'ERROS', val: totalErrosGlobal, sub: 'A revisar', cor: totalErrosGlobal > 0 ? '#fca5a5' : 'var(--text-muted)' },
    { label: 'ASSERTIVIDADE', val: `${pctAcertosGeral}%`, sub: 'Taxa geral', cor: pctAcertosGeral >= 80 ? '#86efac' : 'var(--text-normal)' },
    { label: 'MATÉRIAS', val: disciplinasFiltradas.length, sub: 'Na categoria', cor: 'var(--interactive-accent, #60a5fa)' }
  ];

  kpis.forEach(k => {
    const cardEl = kpiGrid.createEl('div', {
      attr: { style: 'background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 8px; padding: 12px 14px; display: flex; flex-direction: column; gap: 4px;' }
    });
    cardEl.innerHTML = `
      <span class="snoopy-micro" style="color: var(--text-muted); font-weight: 700;">${k.label}</span>
      <span class="snoopy-meta" style="font-size: 20px; font-weight: 800; color: ${k.cor}; line-height: 1.2;">${k.val}</span>
      <span class="snoopy-meta" style="font-size: 10px; color: var(--text-muted);">${k.sub}</span>
    `;
  });

  // RADAR INTEGRADO (CICLO ATIVO & REVISÕES DO DIA NO PRÓPRIO PAINEL)
  const radarGrid = container.createEl('div', {
    cls: 'snoopy-showcase-grid',
    attr: { style: 'margin-bottom: 0;' }
  });

  // Radar Esquerdo: Matéria da Vez no Ciclo
  const filaCiclo = obterFilaDoCiclo(disciplinas);
  let currentIdx = estado.disciplinaAtualIdx || 0;
  if (currentIdx >= filaCiclo.length) currentIdx = 0;
  const materiaVez = filaCiclo[currentIdx];

  const cicloCard = radarGrid.createEl('div', {
    cls: 'snoopy-card-box',
    attr: { style: 'display: flex; flex-direction: column; gap: 10px;' }
  });

  if (materiaVez) {
    cicloCard.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span class="snoopy-section-title">CICLO ATIVO • MATÉRIA DA VEZ</span>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="snoopy-meta" style="color: var(--interactive-accent, #60a5fa); font-weight: bold;">${currentIdx + 1} de ${filaCiclo.length}</span>
          <button id="btn-radar-cfg-ciclo" class="snoopy-btn-action" style="font-size: 10px; padding: 2px 6px;" title="Organizar Fila do Ciclo">⚙</button>
        </div>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-left: 3px solid var(--interactive-accent, #60a5fa); border-radius: 6px; padding: 10px 12px;">
        <div style="display: flex; flex-direction: column; gap: 2px; overflow: hidden; padding-right: 8px;">
          <span style="font-size: 13.5px; font-weight: 700; color: var(--text-normal); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${materiaVez.nome}</span>
          <span class="snoopy-meta">${materiaVez.area || materiaVez.categoria}</span>
        </div>
        <div style="display: flex; gap: 6px; flex-shrink: 0;">
          <button id="btn-radar-foco" class="snoopy-btn-primary" style="font-size: 10.5px; padding: 4px 10px;">+ Foco</button>
          <button id="btn-radar-next" class="snoopy-btn-action" style="font-size: 10.5px; padding: 4px 8px;" title="Avançar ciclo">Avançar →</button>
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
        <span class="snoopy-section-title">CICLO ATIVO</span>
        <button id="btn-radar-cfg-vazio" class="snoopy-btn-action" style="font-size: 10px; padding: 2px 6px;">Organizar</button>
      </div>
      <div class="snoopy-meta" style="padding: 12px 0;">Cadastre matérias para iniciar a fila rotativa.</div>
    `;
    const btnVazio = cicloCard.querySelector('#btn-radar-cfg-vazio');
    if (btnVazio) btnVazio.onclick = () => modais.abrirModalOrganizarCiclo(disciplinas);
  }

  // Radar Direito: Revisões Vencidas / Para Hoje
  const revsHoje = (estado.revisoes || []).filter(r => r.status === 'programada' && r.proximaRevisao <= todayStr);
  const revCard = radarGrid.createEl('div', {
    cls: 'snoopy-card-box',
    attr: { style: 'display: flex; flex-direction: column; gap: 10px;' }
  });

  revCard.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span class="snoopy-section-title">REVISÕES PARA HOJE</span>
      <span class="snoopy-meta" style="color: ${revsHoje.length > 0 ? '#fca5a5' : '#86efac'}; font-weight: bold;">${revsHoje.length} pendente(s)</span>
    </div>
  `;

  if (revsHoje.length === 0) {
    revCard.createEl('div', {
      attr: { class: 'snoopy-meta', style: 'padding: 14px 0; text-align: center;' },
      text: 'Nenhuma revisão pendente para hoje. Curva de retenção em dia!'
    });
  } else {
    const revList = revCard.createEl('div', { attr: { style: 'display: flex; flex-direction: column; gap: 6px; max-height: 120px; overflow-y: auto;' } });
    revsHoje.slice(0, 3).forEach(r => {
      const rItem = revList.createEl('div', {
        attr: { style: 'display: flex; justify-content: space-between; align-items: center; background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-radius: 6px; padding: 6px 10px;' }
      });
      rItem.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px; overflow: hidden;">
          <span class="snoopy-micro" style="padding: 1px 5px; border-radius: 3px; background: rgba(96, 165, 250, 0.2); color: #93c5fd;">${r.intervaloDias || 1}d</span>
          <span style="font-size: 11.5px; font-weight: bold; color: var(--text-normal); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${r.nome}</span>
        </div>
        <button class="snoopy-btn-primary btn-concluir-rev" data-path="${r.materiaPath}" style="font-size: 10px; padding: 3px 8px;">✓ Concluir</button>
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

  // TABELA ANALÍTICA DE MATÉRIAS
  const tableSection = container.createEl('div', {
    cls: 'snoopy-card-box',
    attr: { style: 'display: flex; flex-direction: column; gap: 12px;' }
  });

  tableSection.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span class="snoopy-section-title">TABELA DE MATÉRIAS & SIMULADOS</span>
      <span class="snoopy-meta">${disciplinasFiltradas.length} matérias</span>
    </div>
  `;

  if (disciplinasFiltradas.length === 0) {
    tableSection.createEl('div', {
      attr: { class: 'snoopy-meta', style: 'text-align: center; padding: 24px 0;' },
      text: 'Nenhuma matéria encontrada nesta área. Clique em "+ NOVA MATÉRIA" para adicionar!'
    });
    return;
  }

  const tableWrapper = tableSection.createEl('div', { attr: { style: 'overflow-x: auto;' } });
  const tableEl = tableWrapper.createEl('table', {
    attr: { class: 'snoopy-meta', style: 'width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;' }
  });

  tableEl.innerHTML = `
    <thead>
      <tr style="border-bottom: 2px solid var(--background-modifier-border); color: var(--text-muted); font-size: 10.5px; text-transform: uppercase;">
        <th style="padding: 10px 12px; vertical-align: middle;">Matéria</th>
        <th style="padding: 10px 12px; vertical-align: middle;">Área</th>
        <th style="padding: 10px 12px; vertical-align: middle;">Provas & PDFs</th>
        <th style="padding: 10px 12px; vertical-align: middle;">Tempo Focado</th>
        <th style="padding: 10px 12px; vertical-align: middle;">Questões</th>
        <th style="padding: 10px 12px; vertical-align: middle;">Assertividade</th>
        <th style="padding: 10px 12px; text-align: right; vertical-align: middle;">Ações</th>
      </tr>
    </thead>
    <tbody>
      ${disciplinasFiltradas.map((d, dIdx) => {
        const hTxt = `${Math.floor((d.minutos || 0) / 60)}h${(d.minutos || 0) % 60}m`;

        let provasChips = '';
        if (d.provas && d.provas.length > 0) {
          provasChips = d.provas.map(p => {
            const cleanLink = p.replace(/^\[\[|\]\]$/g, '');
            const shortName = cleanLink.split('/').pop();
            return `<span class="btn-open-pdf" data-link="${cleanLink}" style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 4px; background: rgba(96, 165, 250, 0.14); color: #93c5fd; font-size: 10.5px; cursor: pointer; text-decoration: underline; white-space: nowrap; max-width: 140px; overflow: hidden; text-overflow: ellipsis;" title="Abrir PDF: ${shortName}">📄 ${shortName}</span>`;
          }).join(' ');
        } else {
          provasChips = `<span class="btn-add-pdf" data-idx="${dIdx}" style="font-size: 10.5px; color: var(--text-muted); cursor: pointer; text-decoration: underline; white-space: nowrap;">+ Vincular PDF</span>`;
        }

        return `
          <tr style="border-bottom: 1px solid var(--background-modifier-border); transition: background 0.12s ease;">
            <td style="padding: 12px 12px; vertical-align: middle;">
              <div style="font-size: 13px; font-weight: 700; color: var(--text-normal);">${d.nome}</div>
            </td>
            <td style="padding: 12px 12px; vertical-align: middle; white-space: nowrap;">
              <span style="font-size: 10.5px; padding: 3px 8px; border-radius: 4px; background: rgba(255,255,255,0.06); color: var(--text-normal); border: 1px solid var(--background-modifier-border); display: inline-block;">
                ${d.area || d.categoria || 'Geral'}
              </span>
            </td>
            <td style="padding: 12px 12px; vertical-align: middle;">
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                ${provasChips}
              </div>
            </td>
            <td style="padding: 12px 12px; vertical-align: middle; color: var(--text-normal); white-space: nowrap;">${hTxt}</td>
            <td style="padding: 12px 12px; vertical-align: middle; white-space: nowrap;">${d.acertos || 0}/${d.feitas || 0}</td>
            <td style="padding: 12px 12px; vertical-align: middle; white-space: nowrap;">
              <div style="display: flex; align-items: center; gap: 8px; width: 100px;">
                <div class="snoopy-prog-track" style="height: 5px; flex: 1;">
                  <div class="snoopy-prog-fill" style="width: ${d.pct || 0}%; background: ${(d.pct || 0) >= 80 ? '#86efac' : (d.pct || 0) >= 60 ? 'var(--text-normal)' : '#fca5a5'};"></div>
                </div>
                <span style="font-weight: bold; color: ${(d.pct || 0) >= 80 ? '#86efac' : 'var(--text-normal)'}; font-size: 11px;">${d.pct || 0}%</span>
              </div>
            </td>
            <td style="padding: 12px 12px; text-align: right; vertical-align: middle; white-space: nowrap;">
              <div style="display: flex; justify-content: flex-end; align-items: center; gap: 6px;">
                <button class="snoopy-btn-primary btn-foco-mat" data-idx="${dIdx}" style="font-size: 11px; padding: 4px 10px;">+ Foco</button>
                <button class="snoopy-btn-action btn-menu-disc" data-idx="${dIdx}" style="font-size: 13px; padding: 3px 8px; font-weight: bold;" title="Editar matéria e materiais">⋮</button>
              </div>
            </td>
          </tr>
        `;
      }).join('')}
    </tbody>
  `;

  tableEl.querySelectorAll('.btn-foco-mat').forEach(btn => {
    const idx = parseInt(btn.dataset.idx, 10);
    btn.onclick = () => modais.abrirModalSessao(disciplinasFiltradas[idx]);
  });

  tableEl.querySelectorAll('.btn-menu-disc').forEach(btn => {
    const idx = parseInt(btn.dataset.idx, 10);
    btn.onclick = () => modais.abrirModalEditarMateria(disciplinasFiltradas[idx]);
  });

  tableEl.querySelectorAll('.btn-add-pdf').forEach(btn => {
    const idx = parseInt(btn.dataset.idx, 10);
    btn.onclick = () => modais.abrirModalVincularPdf(disciplinasFiltradas[idx]);
  });

  tableEl.querySelectorAll('.btn-open-pdf').forEach(span => {
    span.onclick = () => {
      if (app && app.workspace && app.workspace.openLinkText) {
        app.workspace.openLinkText(span.dataset.link, "", false);
      }
    };
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderAbaPainel };
}

return { renderAbaPainel };

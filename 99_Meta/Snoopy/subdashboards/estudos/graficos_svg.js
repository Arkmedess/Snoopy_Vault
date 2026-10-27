/**
 * Snoopy Vault - Submódulo: Gerador de Gráficos SVG Puros para Estudos
 * Gera os visuais de Donut (Distribuição por matéria) e Linha 7D (Foco semanal).
 *
 * @module subdashboards/estudos/graficos_svg
 */

const CORES_PALETA = ['#2DCDAA', '#6735BC', '#2196F3', '#FF6347', '#E7D827', '#93c5fd', '#86efac', '#f472b6'];

/**
 * Converte qualquer coleção ou DataArray do DataviewJS em Array nativo do JavaScript.
 *
 * @param {any} col - Coleção de entrada.
 * @returns {Array<any>}
 */
function paraArrayNativo(col) {
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
}

const GraficosSVG = {
  CORES_PALETA,

  /**
   * Monta o Card de Donut SVG.
   */
  montarDonutCard(container, { disciplinasFiltradas, totalMinutosGlobal, totalHorasTxt }) {
    const listaDisciplinas = paraArrayNativo(disciplinasFiltradas);

    const donutCard = container.createEl('div', {
      cls: 'snoopy-card-box',
      attr: { style: 'display: flex; flex-direction: column; gap: 14px; padding: 16px;' }
    });

    donutCard.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span class="snoopy-section-title" style="letter-spacing: 0.05em;">HORAS POR MATÉRIA</span>
        <span class="snoopy-meta" style="font-weight: 700;">Total: ${totalHorasTxt}</span>
      </div>
    `;

    const donutContent = donutCard.createEl('div', {
      attr: { style: 'display: grid; grid-template-columns: 130px 1fr; gap: 16px; align-items: center; min-height: 135px;' }
    });

    const svgWrapper = donutContent.createEl('div', { attr: { style: 'position: relative; width: 130px; height: 130px; display: flex; align-items: center; justify-content: center;' } });

    const raio = 50;
    const circunferencia = 2 * Math.PI * raio;
    let offsetAcumulado = 0;
    let circlesHtml = '';

    let totalQuestoesDonut = 0;
    let totalAcertosDonut = 0;
    listaDisciplinas.forEach(d => {
      totalQuestoesDonut += Number(d.feitas) || 0;
      totalAcertosDonut += Number(d.acertos) || 0;
    });
    const pctGeralDonut = totalQuestoesDonut > 0 ? Math.round((totalAcertosDonut / totalQuestoesDonut) * 100) : 0;

    if (totalMinutosGlobal === 0 && totalQuestoesDonut === 0) {
      circlesHtml = `<circle cx="65" cy="65" r="${raio}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="12" />`;
    } else if (totalMinutosGlobal === 0 && totalQuestoesDonut > 0) {
      listaDisciplinas.forEach((d, idx) => {
        const qtd = Number(d.feitas) || 0;
        if (qtd <= 0) return;
        const proporcao = qtd / totalQuestoesDonut;
        const strokeDash = proporcao * circunferencia;
        const strokeOffset = -offsetAcumulado;
        offsetAcumulado += strokeDash;
        const cor = CORES_PALETA[idx % CORES_PALETA.length];

        circlesHtml += `
          <circle cx="65" cy="65" r="${raio}" fill="none" stroke="${cor}" stroke-width="14"
            stroke-dasharray="${strokeDash} ${circunferencia - strokeDash}"
            stroke-dashoffset="${strokeOffset}" style="transition: stroke-dasharray 0.3s ease;" />
        `;
      });
    } else {
      listaDisciplinas.forEach((d, idx) => {
        if ((d.minutos || 0) <= 0) return;
        const proporcao = d.minutos / totalMinutosGlobal;
        const strokeDash = proporcao * circunferencia;
        const strokeOffset = -offsetAcumulado;
        offsetAcumulado += strokeDash;
        const cor = CORES_PALETA[idx % CORES_PALETA.length];

        circlesHtml += `
          <circle cx="65" cy="65" r="${raio}" fill="none" stroke="${cor}" stroke-width="14"
            stroke-dasharray="${strokeDash} ${circunferencia - strokeDash}"
            stroke-dashoffset="${strokeOffset}" style="transition: stroke-dasharray 0.3s ease;" />
        `;
      });
    }

    const centroSubLabel = (totalMinutosGlobal === 0 && totalQuestoesDonut > 0) ? `${totalQuestoesDonut}q • ${pctGeralDonut}%` : totalHorasTxt;

    svgWrapper.innerHTML = `
      <svg width="130" height="130" viewBox="0 0 130 130" style="transform: rotate(-90deg);">
        <circle cx="65" cy="65" r="${raio}" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="14" />
        ${circlesHtml}
      </svg>
      <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; text-align: center;">
        <span class="snoopy-micro" style="color: var(--text-muted); text-transform: uppercase;">${totalMinutosGlobal === 0 && totalQuestoesDonut > 0 ? 'Questões' : 'Total'}</span>
        <span class="snoopy-meta" style="font-size: 13px; font-weight: 800; color: var(--text-normal);">${centroSubLabel}</span>
      </div>
    `;

    const legendaBox = donutContent.createEl('div', {
      attr: { style: 'display: flex; flex-direction: column; gap: 8px; max-height: 135px; overflow-y: auto; padding-right: 4px;' }
    });

    if (listaDisciplinas.length === 0) {
      legendaBox.innerHTML = '<div class="snoopy-meta">Nenhuma matéria nesta área.</div>';
    } else {
      listaDisciplinas.forEach((d, idx) => {
        const cor = CORES_PALETA[idx % CORES_PALETA.length];
        const min = Number(d.minutos) || 0;
        const usarTotalUnico = totalMinutosGlobal === 0 && listaDisciplinas.length === 1 && totalHorasTxt && totalHorasTxt !== '0h0m' && totalHorasTxt !== '0h00m';
        const hTxt = usarTotalUnico ? totalHorasTxt : `${Math.floor(min / 60)}h${min % 60}m`;
        const pctTxt = totalMinutosGlobal > 0
          ? Math.round((min / totalMinutosGlobal) * 100)
          : (usarTotalUnico ? 100 : (totalQuestoesDonut > 0 ? Math.round(((Number(d.feitas) || 0) / totalQuestoesDonut) * 100) : 0));
        const questInfo = (d.feitas && d.feitas > 0)
          ? ` • <span style="color: ${(d.pct || 0) >= 80 ? '#86efac' : 'var(--text-normal)'}; font-weight: 600;">${d.acertos || 0}/${d.feitas} (${d.pct || 0}%)</span>`
          : '';
        const barWidth = totalMinutosGlobal > 0 ? pctTxt : (d.pct || pctTxt || 0);

        const row = legendaBox.createEl('div', {
          attr: { class: 'snoopy-meta', style: 'display: flex; flex-direction: column; gap: 3px; font-size: 11px;' }
        });
        row.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 6px; overflow: hidden;">
              <span style="width: 7px; height: 7px; border-radius: 50%; background: ${cor}; flex-shrink: 0;"></span>
              <span style="color: var(--text-normal); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${d.nome}</span>
            </div>
            <span style="color: var(--text-muted); flex-shrink: 0;">${hTxt} (${pctTxt}%)${questInfo}</span>
          </div>
          <div class="snoopy-prog-track" style="height: 3px; width: 100%; opacity: 0.85;">
            <div class="snoopy-prog-fill" style="width: ${barWidth}%; background: ${cor};"></div>
          </div>
        `;
      });
    }

    return donutCard;
  },

  /**
   * Monta o Card de Linha SVG (Últimos 7 Dias).
   */
  montarLineChartCard(container, { ultimos7Dias, mediaHorasTxt, maxMinutosPlot, mediaMinutosDia }) {
    const lineChartCard = container.createEl('div', {
      cls: 'snoopy-card-box',
      attr: { style: 'display: flex; flex-direction: column; gap: 14px; padding: 16px;' }
    });

    lineChartCard.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span class="snoopy-section-title" style="letter-spacing: 0.05em;">TEMPO DE ESTUDO & FOCO (7 DIAS)</span>
        <span class="snoopy-meta" style="font-weight: 700;">Média: ${mediaHorasTxt}/dia</span>
      </div>
    `;

    const plotW = 285;
    const plotH = 75;
    const padL = 32;
    const padT = 16;
    const baseLineY = padT + plotH;

    const pontosCoord = ultimos7Dias.map((p, idx) => {
      const cx = padL + (idx / 6) * plotW;
      const cy = baseLineY - (p.minutos / maxMinutosPlot) * plotH;
      return { ...p, cx, cy };
    });

    const linePathD = pontosCoord.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.cx.toFixed(1)},${pt.cy.toFixed(1)}`).join(' ');
    const areaPathD = `${linePathD} L ${pontosCoord[6].cx.toFixed(1)},${baseLineY} L ${pontosCoord[0].cx.toFixed(1)},${baseLineY} Z`;
    const yMediaLine = baseLineY - (mediaMinutosDia / maxMinutosPlot) * plotH;

    const lineSvgContainer = lineChartCard.createEl('div', { attr: { style: 'width: 100%; position: relative;' } });
    lineSvgContainer.innerHTML = `
      <svg width="100%" height="125" viewBox="0 0 345 125" style="overflow: visible;">
        <defs>
          <linearGradient id="areaGradEstudos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--interactive-accent, #60a5fa)" stop-opacity="0.28" />
            <stop offset="100%" stop-color="var(--interactive-accent, #60a5fa)" stop-opacity="0.0" />
          </linearGradient>
        </defs>

        <line x1="${padL}" y1="${baseLineY}" x2="${padL + plotW}" y2="${baseLineY}" stroke="var(--background-modifier-border)" stroke-width="1" />
        <line x1="${padL}" y1="${yMediaLine.toFixed(1)}" x2="${padL + plotW}" y2="${yMediaLine.toFixed(1)}" stroke="rgba(255,255,255,0.12)" stroke-dasharray="3,3" stroke-width="1" />
        <text x="${padL - 4}" y="${(yMediaLine + 3).toFixed(1)}" text-anchor="end" font-size="8" fill="var(--text-muted)" font-family="var(--snoopy-font-mono)">méd</text>

        <path d="${areaPathD}" fill="url(#areaGradEstudos)" />
        <path d="${linePathD}" fill="none" stroke="var(--interactive-accent, #60a5fa)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

        ${pontosCoord.map(pt => `
          <text x="${pt.cx.toFixed(1)}" y="${baseLineY + 14}" text-anchor="middle" font-size="9" fill="${pt.isHoje ? 'var(--interactive-accent, #60a5fa)' : 'var(--text-muted)'}" font-family="var(--snoopy-font-mono)" font-weight="${pt.isHoje ? 'bold' : 'normal'}">
            ${pt.diaSemana}
          </text>

          ${pt.minutos > 0 ? `
            <text x="${pt.cx.toFixed(1)}" y="${(pt.cy - 6).toFixed(1)}" text-anchor="middle" font-size="8.5" fill="${pt.isHoje ? 'var(--interactive-accent, #60a5fa)' : 'var(--text-normal)'}" font-family="var(--snoopy-font-mono)" font-weight="bold">
              ${pt.minutos >= 60 ? `${Math.floor(pt.minutos / 60)}h${pt.minutos % 60 ? `${pt.minutos % 60}m` : ''}` : `${pt.minutos}m`}${pt.questoes > 0 ? ` • ${pt.questoes}q` : ''}
            </text>
          ` : (pt.questoes > 0 ? `
            <text x="${pt.cx.toFixed(1)}" y="${(pt.cy - 6).toFixed(1)}" text-anchor="middle" font-size="8.5" fill="#86efac" font-family="var(--snoopy-font-mono)" font-weight="bold">
              ${pt.questoes}q
            </text>
          ` : '')}

          ${pt.isHoje ? `
            <circle cx="${pt.cx.toFixed(1)}" cy="${pt.cy.toFixed(1)}" r="7" fill="none" stroke="var(--interactive-accent, #60a5fa)" stroke-opacity="0.3" stroke-width="1.5" />
          ` : ''}
          <circle cx="${pt.cx.toFixed(1)}" cy="${pt.cy.toFixed(1)}" r="${pt.isHoje ? 4.5 : 3}" fill="${pt.isHoje ? 'var(--interactive-accent, #60a5fa)' : 'var(--text-normal)'}" stroke="var(--background-secondary, #111118)" stroke-width="1.5" />
        `).join('')}
      </svg>
    `;

    return lineChartCard;
  },

  /**
   * Monta o Card de Barra de Atividade e Frequência Semanal.
   * Apresenta a constância de estudos (dias ativos, minutos e questões por dia).
   */
  montarBarraAtividadeCard(container, { ultimos7Dias = [], diasAtivosSemana = 0, totalMinutosSemana = 0 }) {
    const card = container.createEl('div', {
      cls: 'snoopy-card-box',
      attr: { style: 'display: flex; flex-direction: column; gap: 14px; padding: 16px;' }
    });

    const horasTotaisTxt = totalMinutosSemana >= 60
      ? `${Math.floor(totalMinutosSemana / 60)}h${totalMinutosSemana % 60 ? `${totalMinutosSemana % 60}m` : ''}`
      : `${totalMinutosSemana}m`;

    card.innerHTML = `
      <style>
        .snoopy-bar-hover-wrap:hover .snoopy-bar-tooltip {
          opacity: 1 !important;
          visibility: visible !important;
          transform: translateX(-50%) translateY(-3px) !important;
        }
      </style>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span class="snoopy-section-title" style="letter-spacing: 0.05em;">FREQUÊNCIA & CONSTÂNCIA SEMANAL</span>
        <span class="snoopy-meta" style="font-weight: 700; color: #86efac;">${diasAtivosSemana}/7 dias ativos • ${horasTotaisTxt}</span>
      </div>
    `;

    const maxMin = Math.max(60, ...ultimos7Dias.map(d => d.minutos || 0));
    const barsContainer = card.createEl('div', {
      attr: { style: 'display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; align-items: flex-end; min-height: 95px; padding-top: 10px;' }
    });

    ultimos7Dias.forEach(d => {
      const min = d.minutos || 0;
      const quest = d.questoes || 0;
      const pctAltura = Math.min(100, Math.max(12, Math.round((min / maxMin) * 75)));
      const ativo = min > 0 || quest > 0;
      const corBarra = d.isHoje
        ? 'var(--interactive-accent, #60a5fa)'
        : (ativo ? '#34d399' : 'rgba(255, 255, 255, 0.08)');

      const minTxt = min >= 60 ? `${Math.floor(min / 60)}h${min % 60 ? `${min % 60}m` : ''}` : (min > 0 ? `${min}m` : '');
      const materiasLista = Array.isArray(d.materias) && d.materias.length > 0 ? d.materias.join(', ') : (ativo ? 'Estudo Geral' : 'Sem estudos');
      const tooltipTitle = `${d.diaSemana} (${d.diaMes || d.dataStr || ''}): ${minTxt || '0m'} de foco • ${quest > 0 ? `${quest} questões` : 'Sem questões'} | Matéria(s): ${materiasLista}`;

      const col = barsContainer.createEl('div', {
        cls: 'snoopy-bar-hover-wrap',
        attr: {
          style: 'position: relative; display: flex; flex-direction: column; align-items: center; gap: 5px; height: 100%; justify-content: flex-end; cursor: pointer;',
          title: tooltipTitle
        }
      });

      // Tooltip flutuante de alto contraste no hover
      const tooltip = col.createEl('div', {
        cls: 'snoopy-bar-tooltip',
        attr: {
          style: 'position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%); background: #181822; border: 1px solid rgba(255,255,255,0.18); border-radius: 6px; padding: 6px 10px; min-width: 140px; pointer-events: none; z-index: 999; opacity: 0; visibility: hidden; transition: opacity 0.15s ease, transform 0.15s ease; white-space: nowrap; text-align: left;'
        }
      });
      tooltip.innerHTML = `
        <div style="font-weight: 700; color: #fff; font-size: 11px; margin-bottom: 2px;">${d.diaSemana} (${d.diaMes || ''})</div>
        <div style="color: #93c5fd; font-size: 10.5px; font-weight: 600;">⏱️ ${minTxt || '0m'} ${quest > 0 ? `• ${quest}q` : ''}</div>
        <div style="color: #86efac; font-size: 10px; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; max-width: 180px;">📚 ${materiasLista}</div>
      `;

      const badgeTop = col.createEl('span', {
        cls: 'snoopy-micro',
        attr: { style: `font-size: 9px; font-weight: 700; color: ${d.isHoje ? '#93c5fd' : (ativo ? '#86efac' : 'transparent')}; min-height: 12px;` },
        text: minTxt || (quest > 0 ? `${quest}q` : '-')
      });

      const barWrap = col.createEl('div', {
        attr: { style: 'width: 100%; height: 60px; display: flex; align-items: flex-end; background: rgba(255, 255, 255, 0.03); border-radius: 4px; overflow: hidden;' }
      });

      barWrap.createEl('div', {
        attr: { style: `width: 100%; height: ${ativo ? pctAltura : 8}%; background: ${corBarra}; border-radius: 4px; transition: height 0.2s ease;` }
      });

      col.createEl('span', {
        cls: 'snoopy-micro',
        attr: { style: `font-size: 10px; font-weight: ${d.isHoje ? 'bold' : 'normal'}; color: ${d.isHoje ? 'var(--text-normal)' : 'var(--text-muted)'};` },
        text: d.diaSemana || ''
      });
    });

    return card;
  },

  /**
   * Monta o Card Analítico de Assertividade em Provas e Simulados.
   * Apresenta taxa consolidada de acertos, distribuição de questões e histórico de simulados.
   */
  montarAssertividadeProvasCard(container, { simulados = [], pctGeral = 0, totalAcertos = 0, totalQuestoes = 0 }) {
    const card = container.createEl('div', {
      cls: 'snoopy-card-box',
      attr: { style: 'display: flex; flex-direction: column; gap: 14px; padding: 16px;' }
    });

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span class="snoopy-section-title" style="letter-spacing: 0.05em;">ASSERTIVIDADE EM PROVAS & SIMULADOS</span>
        <span class="snoopy-meta" style="font-weight: 700; color: ${pctGeral >= 80 ? '#86efac' : (pctGeral >= 60 ? '#60a5fa' : 'var(--text-normal)')};">${pctGeral}% geral (${totalAcertos}/${totalQuestoes}q)</span>
      </div>
    `;

    const row = card.createEl('div', {
      attr: { style: 'display: grid; grid-template-columns: 140px 1fr; gap: 16px; align-items: center;' }
    });

    // Donut compacto ou medidor de acertos
    const scoreBox = row.createEl('div', {
      attr: { style: 'background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;' }
    });
    scoreBox.innerHTML = `
      <span class="snoopy-micro" style="color: var(--text-muted); text-transform: uppercase;">Aproveitamento</span>
      <span style="font-size: 26px; font-weight: 800; color: ${pctGeral >= 80 ? '#86efac' : (pctGeral >= 60 ? '#60a5fa' : '#fca5a5')};">${pctGeral}%</span>
      <span class="snoopy-micro" style="color: var(--text-muted);">${totalAcertos} certas • ${Math.max(0, totalQuestoes - totalAcertos)} erradas</span>
    `;

    // Histórico de Simulados
    const listWrap = row.createEl('div', {
      attr: { style: 'display: flex; flex-direction: column; gap: 8px; max-height: 120px; overflow-y: auto; padding-right: 4px;' }
    });

    if (simulados.length === 0) {
      listWrap.innerHTML = `
        <div class="snoopy-meta" style="color: var(--text-muted); font-size: 11.5px; padding: 8px 0;">
          Nenhum simulado cadastrado. Registre seu resultado de prova para calibrar seu índice de acertos.
        </div>
      `;
    } else {
      simulados.slice(0, 4).forEach(s => {
        const qTot = Number(s.questoes) || (Number(s.acertos) + Number(s.erros)) || 0;
        const qAc = Number(s.acertos) || 0;
        const pctSim = qTot > 0 ? Math.round((qAc / qTot) * 100) : 0;
        const sRow = listWrap.createEl('div', {
          attr: { style: 'display: flex; flex-direction: column; gap: 3px; background: rgba(255,255,255,0.02); padding: 5px 8px; border-radius: 5px; border: 1px solid var(--background-modifier-border);' }
        });
        sRow.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11.5px;">
            <b style="color: var(--text-normal);">${s.titulo || 'Simulado'}</b>
            <span style="font-weight: 700; color: ${pctSim >= 80 ? '#86efac' : '#93c5fd'};">${pctSim}% (${qAc}/${qTot})</span>
          </div>
          <div class="snoopy-prog-track" style="height: 3px; width: 100%;">
            <div class="snoopy-prog-fill" style="width: ${pctSim}%; background: ${pctSim >= 80 ? '#86efac' : '#60a5fa'};"></div>
          </div>
        `;
      });
    }

    return card;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GraficosSVG;
}

return GraficosSVG;


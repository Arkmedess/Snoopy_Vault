/**
 * Snoopy Vault - Submódulo: Gerador de Gráficos SVG Puros para Estudos
 * Gera os visuais de Donut (Distribuição por matéria) e Linha 7D (Foco semanal).
 *
 * @module subdashboards/estudos/graficos_svg
 */

const CORES_PALETA = ['#2DCDAA', '#6735BC', '#2196F3', '#FF6347', '#E7D827', '#93c5fd', '#86efac', '#f472b6'];

const GraficosSVG = {
  CORES_PALETA,

  /**
   * Monta o Card de Donut SVG.
   */
  montarDonutCard(container, { disciplinasFiltradas, totalMinutosGlobal, totalHorasTxt }) {
    const donutCard = container.createEl('div', {
      cls: 'snoopy-card-box',
      attr: { style: 'display: flex; flex-direction: column; gap: 12px;' }
    });

    donutCard.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span class="snoopy-section-title">HORAS POR MATÉRIA</span>
        <span class="snoopy-meta">Total: ${totalHorasTxt}</span>
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

    if (totalMinutosGlobal === 0) {
      circlesHtml = `<circle cx="65" cy="65" r="${raio}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="12" />`;
    } else {
      disciplinasFiltradas.forEach((d, idx) => {
        if (d.minutos <= 0) return;
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

    svgWrapper.innerHTML = `
      <svg width="130" height="130" viewBox="0 0 130 130" style="transform: rotate(-90deg);">
        <circle cx="65" cy="65" r="${raio}" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="14" />
        ${circlesHtml}
      </svg>
      <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; text-align: center;">
        <span class="snoopy-micro" style="color: var(--text-muted); text-transform: uppercase;">Total</span>
        <span class="snoopy-meta" style="font-size: 13px; font-weight: 800; color: var(--text-normal);">${totalHorasTxt}</span>
      </div>
    `;

    const legendaBox = donutContent.createEl('div', {
      attr: { style: 'display: flex; flex-direction: column; gap: 6px; max-height: 130px; overflow-y: auto; padding-right: 4px;' }
    });

    if (disciplinasFiltradas.length === 0) {
      legendaBox.innerHTML = '<div class="snoopy-meta">Nenhuma matéria nesta área.</div>';
    } else {
      disciplinasFiltradas.forEach((d, idx) => {
        const cor = CORES_PALETA[idx % CORES_PALETA.length];
        const hTxt = `${Math.floor(d.minutos / 60)}h${d.minutos % 60}m`;
        const pctTxt = totalMinutosGlobal > 0 ? Math.round((d.minutos / totalMinutosGlobal) * 100) : 0;

        const row = legendaBox.createEl('div', {
          attr: { class: 'snoopy-meta', style: 'display: flex; justify-content: space-between; align-items: center; font-size: 11px;' }
        });
        row.innerHTML = `
          <div style="display: flex; align-items: center; gap: 6px; overflow: hidden;">
            <span style="width: 7px; height: 7px; border-radius: 50%; background: ${cor}; flex-shrink: 0;"></span>
            <span style="color: var(--text-normal); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${d.nome}</span>
          </div>
          <span style="color: var(--text-muted); flex-shrink: 0;">${hTxt} (${pctTxt}%)</span>
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
      attr: { style: 'display: flex; flex-direction: column; gap: 10px;' }
    });

    lineChartCard.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span class="snoopy-section-title">TEMPO DE ESTUDO & FOCO (7 DIAS)</span>
        <span class="snoopy-meta">Média: ${mediaHorasTxt}/dia</span>
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

        <path d="${areaPathD}" fill="url(#areaGradEstudos)" />
        <path d="${linePathD}" fill="none" stroke="var(--interactive-accent, #60a5fa)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

        ${pontosCoord.map(pt => `
          <text x="${pt.cx.toFixed(1)}" y="${baseLineY + 14}" text-anchor="middle" font-size="9" fill="${pt.isHoje ? 'var(--interactive-accent, #60a5fa)' : 'var(--text-muted)'}" font-family="var(--snoopy-font-mono)" font-weight="${pt.isHoje ? 'bold' : 'normal'}">
            ${pt.diaSemana}
          </text>

          ${pt.minutos > 0 ? `
            <text x="${pt.cx.toFixed(1)}" y="${(pt.cy - 6).toFixed(1)}" text-anchor="middle" font-size="8.5" fill="${pt.isHoje ? 'var(--interactive-accent, #60a5fa)' : 'var(--text-normal)'}" font-family="var(--snoopy-font-mono)" font-weight="bold">
              ${pt.minutos >= 60 ? `${Math.floor(pt.minutos / 60)}h${pt.minutos % 60 ? `${pt.minutos % 60}m` : ''}` : `${pt.minutos}m`}
            </text>
          ` : ''}

          <circle cx="${pt.cx.toFixed(1)}" cy="${pt.cy.toFixed(1)}" r="${pt.isHoje ? 4.5 : 3}" fill="${pt.isHoje ? 'var(--interactive-accent, #60a5fa)' : 'var(--text-normal)'}" stroke="var(--background-secondary, #111118)" stroke-width="1.5" />
        `).join('')}
      </svg>
    `;

    return lineChartCard;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GraficosSVG;
}

return GraficosSVG;


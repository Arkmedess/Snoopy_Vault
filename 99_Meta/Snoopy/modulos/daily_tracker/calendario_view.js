/**
 * Snoopy Vault - Submódulo: Calendário Mensal Interativo de Tarefas
 * Renderiza um mini-calendário mensal no estilo Tech Minimal Cockpit,
 * mapeando tarefas marcadas por data com micro-indicadores visuais (dots)
 * e disparando eventos de filtro interativo na Central de Tarefas.
 *
 * @module modulos/daily_tracker/calendario_view
 */

const CalendarioView = {
  /**
   * Monta o calendário interativo no elemento contêiner.
   *
   * @param {object} params - Parâmetros de montagem.
   * @param {HTMLElement} params.container - Elemento pai onde o calendário será inserido.
   * @param {object} params.ctx - Contexto compartilhado da dashboard.
   * @param {function(string|null): void} [params.onSelectData] - Callback ao selecionar/desmarcar data.
   * @param {string} [params.dataInicial] - Data ISO inicialmente selecionada.
   */
  async montar({ container, ctx, onSelectData, dataInicial = null }) {
    const { app, dv, todayStr, DateUtils } = ctx;

    const baseDate = todayStr ? new Date(`${todayStr}T00:00:00`) : new Date();
    let anoExibicao = baseDate.getFullYear();
    let mesExibicao = baseDate.getMonth(); // 0 a 11
    let dataSelecionada = dataInicial;

    const calBox = container.createEl('div', { cls: 'snoopy-cal-box' });

    // Mapeamento de tarefas com data marcada no cofre
    function mapearTarefasPorData() {
      const mapa = new Map(); // dataIso -> { total, pendentes, atrasadas, concluidas }
      if (!dv || typeof dv.pages !== 'function') return mapa;

      try {
        const escopo = dv.pages('"01_Inbox" or "02_Projetos" or "03_Estudos" or "04_Leituras"')
          .where(p => p.file && !p.file.path.includes('Template') && !p.file.path.includes('00_Home') && (!p.file.name || !p.file.name.includes('Painel')));

        const tasks = escopo.file.tasks
          .where(t => !t.text.includes('Leitura 20 min') && !t.text.includes('Pomodoro 4x') && !t.text.includes('Exercício Físico'));

        tasks.forEach(t => {
          let dueIso = null;
          // 1. Busca por formato ISO YYYY-MM-DD
          const matchIso = t.text.match(/(?:due:|📅)\s*(\d{4}-\d{2}-\d{2})/);
          if (matchIso) {
            dueIso = matchIso[1];
          } else {
            // 2. Busca por formato brasileiro DD-MM-YYYY
            const matchBr = t.text.match(/(?:due:|📅)\s*(\d{2}[-/]\d{2}[-/]\d{4})/);
            if (matchBr && DateUtils && typeof DateUtils.normalizarParaISO === 'function') {
              dueIso = DateUtils.normalizarParaISO(matchBr[1]);
            }
          }

          if (dueIso) {
            if (!mapa.has(dueIso)) {
              mapa.set(dueIso, { total: 0, pendentes: 0, atrasadas: 0, concluidas: 0 });
            }
            const info = mapa.get(dueIso);
            info.total++;
            if (t.completed) {
              info.concluidas++;
            } else {
              info.pendentes++;
              if (dueIso < todayStr) {
                info.atrasadas++;
              }
            }
          }
        });
      } catch (err) {
        console.warn('[CalendarioView] Falha ao mapear tarefas por data:', err);
      }

      return mapa;
    }

    const mesesNomes = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    function renderizar() {
      calBox.innerHTML = '';
      const mapaTarefas = mapearTarefasPorData();

      // 1. Cabeçalho com Mês/Ano e Navegação
      const header = calBox.createEl('div', { cls: 'snoopy-cal-header' });

      const pad = (n) => String(n).padStart(2, '0');
      const prefixoMes = `${anoExibicao}-${pad(mesExibicao + 1)}`;
      let totalTarefasMes = 0;
      let totalPendentesMes = 0;
      mapaTarefas.forEach((v, k) => {
        if (k.startsWith(prefixoMes)) {
          totalTarefasMes += v.total;
          totalPendentesMes += v.pendentes;
        }
      });

      const titleBox = header.createEl('div', { attr: { style: 'display: flex; align-items: baseline; gap: 8px;' } });
      titleBox.createEl('span', {
        cls: 'snoopy-cal-title',
        text: `${mesesNomes[mesExibicao]} ${anoExibicao}`
      });
      if (totalTarefasMes > 0) {
        titleBox.createEl('span', {
          cls: 'snoopy-micro',
          attr: { style: 'color: #94a3b8; font-size: 11px;' },
          text: `(${totalTarefasMes} tarefa${totalTarefasMes === 1 ? '' : 's'} • ${totalPendentesMes} pendente${totalPendentesMes === 1 ? '' : 's'})`
        });
      }

      const nav = header.createEl('div', { cls: 'snoopy-cal-nav' });

      const btnPrev = nav.createEl('button', {
        cls: 'snoopy-cal-nav-btn',
        attr: { title: 'Mês anterior' },
        text: '‹'
      });
      btnPrev.onclick = () => {
        mesExibicao--;
        if (mesExibicao < 0) {
          mesExibicao = 11;
          anoExibicao--;
        }
        renderizar();
      };

      const btnHoje = nav.createEl('button', {
        cls: 'snoopy-btn-action snoopy-btn-sm',
        attr: { style: 'font-size: 10px; padding: 2px 6px; height: 22px;' },
        text: 'Hoje'
      });
      btnHoje.onclick = () => {
        const d = todayStr ? new Date(`${todayStr}T00:00:00`) : new Date();
        anoExibicao = d.getFullYear();
        mesExibicao = d.getMonth();
        renderizar();
      };

      const btnNext = nav.createEl('button', {
        cls: 'snoopy-cal-nav-btn',
        attr: { title: 'Próximo mês' },
        text: '›'
      });
      btnNext.onclick = () => {
        mesExibicao++;
        if (mesExibicao > 11) {
          mesExibicao = 0;
          anoExibicao++;
        }
        renderizar();
      };

      // 2. Grade de Dias da Semana
      const grid = calBox.createEl('div', { cls: 'snoopy-cal-grid' });
      const diasSemana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
      diasSemana.forEach(s => {
        grid.createEl('div', { cls: 'snoopy-cal-weekday', text: s });
      });

      // 3. Cálculos de Dias do Mês
      const primeiroDia = new Date(anoExibicao, mesExibicao, 1).getDay(); // 0 = Domingo
      const totalDiasMes = new Date(anoExibicao, mesExibicao + 1, 0).getDate();
      const totalDiasMesAnterior = new Date(anoExibicao, mesExibicao, 0).getDate();

      // Células do mês anterior para completar a primeira semana
      for (let i = primeiroDia - 1; i >= 0; i--) {
        const diaNum = totalDiasMesAnterior - i;
        grid.createEl('div', {
          cls: 'snoopy-cal-day other-month',
          text: String(diaNum)
        });
      }

      // Células do mês atual
      for (let dia = 1; dia <= totalDiasMes; dia++) {
        const dataIso = `${anoExibicao}-${pad(mesExibicao + 1)}-${pad(dia)}`;
        const isHoje = dataIso === todayStr;
        const isAtivo = dataIso === dataSelecionada;
        const dadosTarefa = mapaTarefas.get(dataIso);

        let classes = 'snoopy-cal-day';
        if (isHoje) classes += ' today';
        if (isAtivo) classes += ' active';

        const cell = grid.createEl('div', {
          cls: classes,
          attr: {
            title: isHoje ? `Hoje (${dataIso})` : dataIso
          }
        });

        cell.createEl('span', { text: String(dia) });

        // Micro-dot indicador de tarefas
        if (dadosTarefa && dadosTarefa.total > 0) {
          let dotClass = 'dot-pending';
          if (dadosTarefa.atrasadas > 0) {
            dotClass = 'dot-late';
          } else if (dadosTarefa.pendentes === 0 && dadosTarefa.concluidas > 0) {
            dotClass = 'dot-done';
          }

          cell.createEl('span', {
            cls: `snoopy-cal-dot ${dotClass}`,
            attr: {
              title: `${dadosTarefa.total} tarefa(s) marcadas (${dadosTarefa.pendentes} pendentes)`
            }
          });
        }

        cell.onclick = () => {
          if (dataSelecionada === dataIso) {
            dataSelecionada = null; // desmarca
          } else {
            dataSelecionada = dataIso;
          }

          if (typeof onSelectData === 'function') {
            onSelectData(dataSelecionada);
          }
          if (ctx.events && typeof ctx.events.emit === 'function') {
            ctx.events.emit('tarefas:filtrar-data', { data: dataSelecionada });
          }

          renderizar();
        };
      }

      // Rodapé informativo se houver data selecionada
      if (dataSelecionada) {
        const footer = calBox.createEl('div', {
          cls: 'snoopy-micro',
          attr: {
            style: 'display: flex; justify-content: space-between; align-items: center; padding-top: 6px; border-top: 1px solid var(--snoopy-border); color: #60a5fa;'
          }
        });

        const p = dataSelecionada.split('-');
        const dataBrFormatada = `${p[2]}/${p[1]}/${p[0]}`;
        const contagem = mapaTarefas.get(dataSelecionada)?.total || 0;

        footer.innerHTML = `
          <span>Filtro: <strong>${dataBrFormatada}</strong> (${contagem} tarefa${contagem === 1 ? '' : 's'})</span>
          <button id="btn-limpar-cal-filtro" class="snoopy-chip-del" title="Limpar filtro de data" style="font-size: 11px;">✕ Limpar</button>
        `;

        const btnLimpar = footer.querySelector('#btn-limpar-cal-filtro');
        if (btnLimpar) {
          btnLimpar.onclick = () => {
            dataSelecionada = null;
            if (typeof onSelectData === 'function') onSelectData(null);
            if (ctx.events && typeof ctx.events.emit === 'function') {
              ctx.events.emit('tarefas:filtrar-data', { data: null });
            }
            renderizar();
          };
        }
      }
    }

    renderizar();

    return {
      recarregar: () => renderizar(),
      obterDataSelecionada: () => dataSelecionada
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CalendarioView;
}

return CalendarioView;

/**
 * Snoopy Vault - Submódulo: Jardim Botânico & Heatmap Pomodoro
 * Gerencia a progressão evolutiva da planta de foco, o cálculo de constância (streak),
 * e a geração da grade de calor de 30 dias com métricas de tempo.
 *
 * @module modulos/pomodoro/pomodoro_jardim
 */

const PomodoroJardim = {
  /**
   * Retorna o catálogo dos 6 estágios botânicos disponíveis na progressão do foco.
   *
   * @returns {Array<{ nivel: number, titulo: string, ciclosMin: number, iconName: string, badge: string, descricao: string }>}
   */
  obterGuiaEstagios() {
    return [
      {
        nivel: 1,
        titulo: 'Semente Plantada',
        ciclosMin: 0,
        iconName: 'sprout',
        badge: 'NÍVEL 1',
        descricao: 'Inicie seu primeiro foco para germinar a plantinha.',
        lore: 'Toda grande floresta começa com uma única semente no solo fértil.'
      },
      {
        nivel: 1,
        titulo: 'Plântula Ativa',
        ciclosMin: 1,
        iconName: 'sprout',
        badge: 'NÍVEL 1',
        descricao: 'Primeiro ciclo do dia consolidado com sucesso.',
        lore: 'Primeira folhinha buscando a luz. O início da sua constância diária.'
      },
      {
        nivel: 2,
        titulo: 'Brotinho Verdejante',
        ciclosMin: 2,
        iconName: 'sprout',
        badge: 'NÍVEL 2',
        descricao: 'Constância em desenvolvimento acelerado.',
        lore: 'As raízes ganham firmeza no solo conforme as distrações silenciam.'
      },
      {
        nivel: 3,
        titulo: 'Cerejeira em Flor',
        ciclosMin: 4,
        iconName: 'flower-2',
        badge: 'NÍVEL 3',
        descricao: 'Meta diária batida com primor! Florescimento mental.',
        lore: 'Tome um gole de Matcha e aprecie as flores da sua disciplina diária.'
      },
      {
        nivel: 4,
        titulo: 'Pinheiro Robusto',
        ciclosMin: 6,
        iconName: 'tree-pine',
        badge: 'NÍVEL 4',
        descricao: 'Foco inabalável. Raízes profundas e resiliência.',
        lore: 'Tronco forte e copas altas. Resistente a qualquer vendaval de distrações.'
      },
      {
        nivel: 5,
        titulo: 'Floresta Mágica',
        ciclosMin: 8,
        iconName: 'trees',
        badge: 'MESTRE',
        descricao: 'Mestria absoluta! Você construiu um ecossistema produtivo.',
        lore: 'Um ecossistema místico onde a mente opera no ápice do flow produtivo.'
      }
    ];
  },

  /**
   * Determina o estágio evolutivo da plantinha com base na quantidade de ciclos de foco de hoje.
   *
   * @param {number} ciclos - Quantidade de ciclos concluídos hoje.
   * @returns {{ iconName: string, titulo: string, descricao: string, badge: string, pct: number }}
   */
  calcularEstagioPlanta(ciclos = 0) {
    const c = Number(ciclos) || 0;
    if (c >= 8) {
      return {
        iconName: 'trees',
        titulo: 'Floresta Mágica',
        descricao: 'Mestria absoluta! Você construiu um ecossistema produtivo.',
        fraseInspiradora: 'Mestre da Floresta! Um ecossistema lendário de foco floresce hoje.',
        badge: 'MESTRE',
        pct: 100,
        proximoNivel: null
      };
    }
    if (c >= 6) {
      return {
        iconName: 'tree-pine',
        titulo: 'Pinheiro Robusto',
        descricao: 'Foco inabalável. Raízes profundas e resiliência.',
        fraseInspiradora: 'Raízes profundas. Como um Pinheiro Alpino, seu foco resiste a tudo.',
        badge: 'NÍVEL 4',
        pct: 85,
        proximoNivel: { nome: 'Floresta Mágica', ciclosFaltantes: 8 - c }
      };
    }
    if (c >= 4) {
      return {
        iconName: 'flower-2',
        titulo: 'Cerejeira em Flor',
        descricao: 'Meta diária batida com primor! Florescimento mental.',
        fraseInspiradora: 'Meta diária batida! Sua Cerejeira floresceu com esplendor e vigor.',
        badge: 'NÍVEL 3',
        pct: 65,
        proximoNivel: { nome: 'Pinheiro Robusto', ciclosFaltantes: 6 - c }
      };
    }
    if (c >= 2) {
      return {
        iconName: 'sprout',
        titulo: 'Brotinho Verdejante',
        descricao: 'Constância em desenvolvimento acelerado.',
        fraseInspiradora: 'Constância em expansão! Seu broto ganha firmeza e luz solar.',
        badge: 'NÍVEL 2',
        pct: 40,
        proximoNivel: { nome: 'Cerejeira em Flor', ciclosFaltantes: 4 - c }
      };
    }
    if (c >= 1) {
      return {
        iconName: 'sprout',
        titulo: 'Plântula Ativa',
        descricao: 'Primeiro ciclo do dia consolidado com sucesso.',
        fraseInspiradora: 'Primeira folhinha brotou! Guarde distrações e nutra suas raízes.',
        badge: 'NÍVEL 1',
        pct: 20,
        proximoNivel: { nome: 'Brotinho Verdejante', ciclosFaltantes: 2 - c }
      };
    }
    return {
      iconName: 'sprout',
      titulo: 'Semente Plantada',
      descricao: 'Inicie seu primeiro foco para germinar a plantinha.',
      fraseInspiradora: 'Uma semente plantada hoje é uma floresta amanhã. Inicie seu foco.',
      badge: 'NÍVEL 1',
      pct: 0,
      proximoNivel: { nome: 'Plântula Ativa', ciclosFaltantes: 1 }
    };
  },

  /**
   * Calcula as métricas agregadas de constância para o histórico dos últimos 30 dias.
   *
   * @param {object} mapaFoco - Dicionário de foco no formato { 'YYYY-MM-DD': totalCiclos }.
   * @param {string} todayStr - Data atual em formato ISO ('YYYY-MM-DD').
   * @param {Date} [dataReferencia] - Data base para a retroação dos 30 dias.
   * @returns {{ totalPomos: number, weekPomos: number, peakPomos: number, streak: number, dias: Array<{ dataStr: string, valor: number, nivel: number }> }}
   */
  calcularHistorico30Dias(mapaFoco = {}, todayStr = '', dataReferencia = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    const dias = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(dataReferencia);
      d.setDate(d.getDate() - i);
      const dStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const val = Number(mapaFoco[dStr]) || 0;

      let nivel = 0;
      if (val >= 4) nivel = 4;
      else if (val === 3) nivel = 3;
      else if (val === 2) nivel = 2;
      else if (val === 1) nivel = 1;

      dias.push({ dataStr: dStr, valor: val, nivel });
    }

    let totalPomos = 0;
    let weekPomos = 0;
    let peakPomos = 0;
    let streak = 0;
    let streakCounted = false;

    // Cálculo da sequência (streak) a partir do dia mais recente
    for (let i = dias.length - 1; i >= 0; i--) {
      const dStr = dias[i].dataStr;
      const val = dias[i].valor;
      if (!streakCounted) {
        if (val > 0) {
          streak++;
        } else if (dStr !== todayStr) {
          streakCounted = true;
        }
      }
    }

    // Totais e semana
    dias.forEach((item, idx) => {
      totalPomos += item.valor;
      if (idx >= 23) weekPomos += item.valor;
      if (item.valor > peakPomos) peakPomos = item.valor;
    });

    return { totalPomos, weekPomos, peakPomos, streak, dias };
  },

  /**
   * Mapeia as sessões concluídas do dia para espécimes botânicos no "Bosque do Dia".
   *
   * @param {number} totalCiclos - Quantidade de ciclos concluídos hoje.
   * @param {Array<{ titulo?: string, hora?: string, min?: number }>} [sessoesHoje=[]] - Sessões com metadados.
   * @returns {Array<{ id: number, iconName: string, cor: string, label: string, titulo: string, hora: string, min: number }>}
   */
  obterArvoresDoBosque(totalCiclos = 0, sessoesHoje = []) {
    const total = Number(totalCiclos) || 0;
    if (total <= 0) return [];

    const especies = [
      { iconName: 'sprout', cor: '#86efac' },
      { iconName: 'flower-2', cor: '#93c5fd' },
      { iconName: 'tree-pine', cor: '#4ade80' },
      { iconName: 'trees', cor: '#86efac' },
      { iconName: 'sparkles', cor: '#facc15' }
    ];

    const arvores = [];
    for (let i = 0; i < total; i++) {
      const sessao = sessoesHoje[i] || {};
      const especie = especies[i % especies.length];
      const titulo = sessao.titulo || `Ciclo #${i + 1}`;
      const hora = sessao.hora || '';
      const min = Number(sessao.min) || 25;

      const label = hora
        ? `${titulo} (${hora} • ${min}m)`
        : `${titulo} (${min}m)`;

      arvores.push({
        id: i + 1,
        iconName: especie.iconName,
        cor: especie.cor,
        label,
        titulo,
        hora,
        min
      });
    }

    return arvores;
  },

  /**
   * Atualiza a renderização visual do jardim botânico no DOM.
   *
   * @param {HTMLElement} root - Elemento raiz contendo o card do jardim.
   * @param {object} params - Parâmetros de renderização.
   * @param {number} params.completedCyclesToday - Ciclos completados hoje.
   * @param {number} params.dailyGoal - Meta de ciclos diários.
   * @param {number} params.focusMin - Duração em minutos de cada ciclo.
   * @param {Array<{ titulo?: string, hora?: string, min?: number }>} [params.sessoesHoje] - Sessões de hoje.
   * @param {Function} [params.renderIcon] - Função utilitária para renderizar ícones Lucide.
   */
  atualizarVisualPlanta(root, params = {}) {
    if (!root) return;
    const { completedCyclesToday = 0, dailyGoal = 4, focusMin = 25, sessoesHoje = [], renderIcon, arvoreAtiva } = params;

    const pAv = root.querySelector('#snoopy-plant-avatar');
    const pTit = root.querySelector('#snoopy-stage-title');
    const pNextChip = root.querySelector('#snoopy-stage-next-chip');
    const pBdg = root.querySelector('#snoopy-stage-badge');
    const pBar = root.querySelector('#snoopy-plant-bar');
    const pTaxa = root.querySelector('#snoopy-card-taxa-foco');
    const cLabel = root.querySelector('#snoopy-cycle-label');
    const tStats = root.querySelector('#snoopy-today-stats');

    if (!pAv) return;

    if (cLabel) cLabel.textContent = `Ciclo ${completedCyclesToday + 1} de ${dailyGoal}`;
    if (tStats) tStats.textContent = `${completedCyclesToday} ciclos hoje (${completedCyclesToday * focusMin} min)`;

    const estagio = this.calcularEstagioPlanta(completedCyclesToday);

    const mapaCustom = {
      sprout: { icon: 'sprout', cor: '#86efac' },
      cherry: { icon: 'flower-2', cor: '#f472b6' },
      pine: { icon: 'tree-pine', cor: '#34d399' },
      star: { icon: 'sparkles', cor: '#60a5fa' },
      bonsai: { icon: 'leaf', cor: '#a78bfa' },
      ancient: { icon: 'trees', cor: '#4ade80' }
    };

    let iconName = estagio.iconName;
    let iconColor = '#86efac';
    if (arvoreAtiva && mapaCustom[arvoreAtiva]) {
      iconName = mapaCustom[arvoreAtiva].icon;
      iconColor = mapaCustom[arvoreAtiva].cor;
    }

    if (renderIcon) {
      pAv.innerHTML = '';
      renderIcon(pAv, iconName, { size: 30, color: iconColor });
    }
    if (pTit) pTit.textContent = estagio.titulo;
    if (pBdg) pBdg.textContent = estagio.badge;
    if (pBar) pBar.style.width = `${estagio.pct}%`;

    if (pNextChip) {
      if (estagio.proximoNivel) {
        const plural = estagio.proximoNivel.ciclosFaltantes > 1 ? 's' : '';
        pNextChip.innerHTML = `Próximo: <strong style="color: #86efac;">${estagio.proximoNivel.nome}</strong> (+${estagio.proximoNivel.ciclosFaltantes} foco${plural})`;
      } else {
        pNextChip.innerHTML = `<strong style="color: #86efac;">Nível Mestre Atingido!</strong>`;
      }
    }

    if (pTaxa) {
      const ganhoCiclo = Math.max(1, Math.floor(focusMin / 5));
      pTaxa.textContent = `Ciclo ${focusMin}m = ${ganhoCiclo} 🪙`;
    }
  },

  /**
   * Renderiza os quadrinhos do Heatmap de 30 dias e preenche as métricas laterais.
   *
   * @param {HTMLElement} root - Elemento raiz contendo o container do heatmap.
   * @param {object} params - Parâmetros de renderização.
   * @param {object} params.mapaFoco - Dicionário histórico { 'YYYY-MM-DD': totalCiclos }.
   * @param {string} params.todayStr - Data atual ISO.
   * @param {number} params.focusMin - Duração do ciclo em minutos.
   * @param {number} [params.dailyGoal] - Meta diária em ciclos.
   * @param {Date} [params.now] - Instância de data atual.
   */
  obterDetalhesDiaHeatmap(mapaFoco = {}, dataStr = '', focusMin = 25, dailyGoal = 4) {
    const ciclos = Number(mapaFoco[dataStr]) || 0;
    const minutos = ciclos * focusMin;
    const atingiuMeta = ciclos >= dailyGoal;

    let nivel = 0;
    if (ciclos >= 4) nivel = 4;
    else if (ciclos === 3) nivel = 3;
    else if (ciclos === 2) nivel = 2;
    else if (ciclos === 1) nivel = 1;

    let dataFormatada = dataStr;
    if (dataStr && dataStr.includes('-')) {
      const partes = dataStr.split('-');
      if (partes.length === 3) {
        dataFormatada = `${partes[2]}/${partes[1]}/${partes[0]}`;
      }
    }

    let label = '';
    if (ciclos > 0) {
      const metaTxt = atingiuMeta ? ' - Meta Diária' : '';
      label = `${dataFormatada} • ${ciclos} ciclos (${minutos} min)${metaTxt}`;
    } else {
      label = `${dataFormatada} • Nenhum foco registrado`;
    }

    return {
      dataStr,
      dataFormatada,
      ciclos,
      minutos,
      atingiuMeta,
      nivel,
      label
    };
  },

  renderizarHeatmap(root, params = {}) {
    if (!root) return;
    const { mapaFoco = {}, todayStr = '', focusMin = 25, dailyGoal = 4, now = new Date() } = params;

    const pomoHeatGrid = root.querySelector('.snoopy-heat-grid');
    const inspectionEl = root.querySelector('#snoopy-heat-inspection');
    const stats = this.calcularHistorico30Dias(mapaFoco, todayStr, now);

    if (pomoHeatGrid) {
      pomoHeatGrid.innerHTML = '';
      stats.dias.forEach((d) => {
        let celula = null;
        if (typeof pomoHeatGrid.createEl === 'function') {
          celula = pomoHeatGrid.createEl('div', {
            cls: `snoopy-heat-cell heat-lvl-${d.nivel}`,
            attr: {
              title: `${d.dataStr}: ${d.valor} ciclo(s) (${d.valor * focusMin} min)`,
              'data-date': d.dataStr,
              role: 'button',
              tabindex: '0',
              'aria-label': `${d.dataStr}: ${d.valor} ciclo(s)`
            }
          });
        }

        if (celula && inspectionEl) {
          const ativarInspecao = () => {
            const todas = pomoHeatGrid.querySelectorAll('.snoopy-heat-cell');
            todas.forEach((c) => c.classList.remove('is-selected'));
            celula.classList.add('is-selected');

            const info = this.obterDetalhesDiaHeatmap(mapaFoco, d.dataStr, focusMin, dailyGoal);
            const statusCor = info.ciclos > 0 ? '#86efac' : '#71717a';
            inspectionEl.innerHTML = `<span style="color: ${statusCor}; font-weight: 600;">${info.label}</span>`;
          };

          celula.onclick = ativarInspecao;
          celula.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              ativarInspecao();
            }
          };
        }
      });
    }

    const mWeek = root.querySelector('#metric-week');
    const mPeak = root.querySelector('#metric-peak');
    const mStreak = root.querySelector('#metric-streak');
    const mTotal = root.querySelector('#metric-total');

    if (mWeek) mWeek.textContent = `${stats.weekPomos * focusMin}m`;
    if (mPeak) mPeak.textContent = `${stats.peakPomos * focusMin}m`;
    if (mStreak) mStreak.textContent = `${stats.streak} dias`;
    if (mTotal) mTotal.textContent = `${stats.totalPomos} ciclos`;
  },

  /**
   * Abre o modal rico com o ecossistema botânico completo, bosque do dia,
   * lojinha de árvores por moedas de foco e guia de progressão.
   *
   * @param {object} ModalFactory - Fábrica nativa de modais.
   * @param {object} params - Parâmetros de contexto.
   * @param {number} [params.completedCyclesToday=0] - Ciclos completados hoje.
   * @param {number} [params.dailyGoal=4] - Meta diária.
   * @param {number} [params.focusMin=25] - Minutos por ciclo.
   * @param {Array} [params.sessoesHoje=[]] - Sessões do dia.
   * @param {Function} [params.renderIcon] - Utilitário de ícones.
   * @param {object} [params.JardimStore] - Gerenciador de economia e loja botânica.
   * @param {object} [params.app] - Instância do Obsidian.
   * @param {Function} [params.onAtualizar] - Callback ao comprar/equipar árvore.
   * @returns {Promise<HTMLElement|null>}
   */
  async abrirModalEstufa(ModalFactory, params = {}) {
    if (!ModalFactory || typeof ModalFactory.abrir !== 'function') return null;
    const { completedCyclesToday = 0, dailyGoal = 4, focusMin = 25, sessoesHoje = [], renderIcon, JardimStore, app, onAtualizar } = params;

    const estagioAtual = this.calcularEstagioPlanta(completedCyclesToday);
    const guia = this.obterGuiaEstagios();
    const arvores = this.obterArvoresDoBosque(completedCyclesToday, sessoesHoje);

    // Carrega dados da economia da loja
    let storeData = JardimStore && typeof JardimStore.carregar === 'function' && app
      ? await JardimStore.carregar(app)
      : (JardimStore && typeof JardimStore.obterEstadoPadrao === 'function' ? JardimStore.obterEstadoPadrao() : { moedas: 0, arvoreAtiva: 'sprout', desbloqueadas: ['sprout'] });

    const catalogo = JardimStore && JardimStore.CATALOGO ? JardimStore.CATALOGO : [];
    const ganhoPorCiclo = Math.max(1, Math.floor(focusMin / 5));

    const renderCatalogoCards = (dados) => {
      return catalogo.map(item => {
        const desbloqueada = dados.desbloqueadas.includes(item.id);
        const ativa = dados.arvoreAtiva === item.id;
        const borda = ativa ? 'border: 1px solid #4ade80; background: rgba(74, 222, 128, 0.06);' : 'border: 1px solid rgba(255,255,255,0.08); background: #13131c;';

        return `
          <div class="snoopy-loja-card" style="display: flex; flex-direction: column; justify-content: space-between; gap: 8px; padding: 12px; border-radius: 8px; ${borda}">
            <div style="display: flex; gap: 10px; align-items: flex-start;">
              <div class="snoopy-loja-tree-icon" data-icon="${item.iconName}" data-color="${item.cor}" style="width: 38px; height: 38px; border-radius: 50%; background: #181822; border: 1px solid ${item.cor}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;"></div>
              <div style="flex: 1; min-width: 0;">
                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                  <span style="font-weight: 700; font-size: 13px; color: #ffffff;">${item.nome}</span>
                  <span class="snoopy-micro" style="color: ${item.cor}; font-weight: bold; font-size: 10px;">${item.categoria}</span>
                </div>
                <div style="font-size: 11px; color: #a1a1aa; margin-top: 2px;">${item.beneficio}</div>
                <div style="font-size: 10.5px; color: #71717a; font-style: italic; margin-top: 3px;">"${item.lore}"</div>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.05);">
              <span style="font-weight: 800; font-size: 12px; color: ${desbloqueada ? '#86efac' : '#facc15'};">
                ${desbloqueada ? 'Desbloqueada' : `${item.preco} 🪙`}
              </span>
              <div>
                ${ativa
                  ? `<span class="snoopy-micro" style="padding: 3px 8px; border-radius: 4px; background: rgba(74, 222, 128, 0.15); color: #86efac; font-weight: 700; font-size: 10.5px;">✓ Em Cultivo</span>`
                  : desbloqueada
                    ? `<button class="snoopy-btn-action snoopy-btn-sm btn-equipar-arvore" data-id="${item.id}" style="font-size: 11px; padding: 3px 10px; cursor: pointer;">Plantar Esta</button>`
                    : `<button class="snoopy-btn-primary snoopy-btn-sm btn-comprar-arvore" data-id="${item.id}" style="font-size: 11px; padding: 3px 10px; cursor: pointer;">Desbloquear (${item.preco} 🪙)</button>`
                }
              </div>
            </div>
          </div>
        `;
      }).join('');
    };

    const modalObj = ModalFactory.abrir({
      maxWidth: '680px',
      htmlContent: `
        <div class="snoopy-card-header" style="margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span id="snoopy-modal-estufa-header-icon"></span>
            <div>
              <span class="snoopy-section-title">ECOSSISTEMA BOTÂNICO & LOJA DE FOCO</span>
              <div class="snoopy-card-subtitle">Cultive árvores a cada pomodoro, ganhe moedas e desbloqueie novas espécies</div>
            </div>
          </div>
          <button class="snoopy-modal-close" title="Fechar"></button>
        </div>

        <!-- Barra de Economia & Status -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px;">
          <div style="background: #13131c; border: 1px solid rgba(250, 204, 21, 0.25); border-radius: 8px; padding: 10px 14px; text-align: center;">
            <div style="font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em; color: #facc15; font-weight: 800;">Moedas de Seiva</div>
            <div id="snoopy-store-balance" style="font-size: 18px; font-weight: 800; color: #ffffff; margin-top: 2px;">${storeData.moedas} 🪙</div>
            <div class="snoopy-micro" style="color: #a1a1aa; font-size: 10px;">+1 moeda a cada 5m de foco</div>
          </div>
          <div style="background: #13131c; border: 1px solid rgba(74, 222, 128, 0.2); border-radius: 8px; padding: 10px 14px; text-align: center;">
            <div style="font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em; color: #86efac; font-weight: 800;">Árvores Hoje</div>
            <div style="font-size: 18px; font-weight: 800; color: #ffffff; margin-top: 2px;">${arvores.length} 🌲</div>
            <div class="snoopy-micro" style="color: #a1a1aa; font-size: 10px;">${completedCyclesToday} ciclos consolidados</div>
          </div>
          <div style="background: #13131c; border: 1px solid rgba(96, 165, 250, 0.2); border-radius: 8px; padding: 10px 14px; text-align: center;">
            <div style="font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em; color: #93c5fd; font-weight: 800;">Tempo de Foco</div>
            <div style="font-size: 18px; font-weight: 800; color: #ffffff; margin-top: 2px;">${completedCyclesToday * focusMin}m ⏱️</div>
            <div class="snoopy-micro" style="color: #a1a1aa; font-size: 10px;">acumulado hoje</div>
          </div>
        </div>

        <!-- Abas de Navegação -->
        <div class="snoopy-toolbar" style="border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 6px; margin-bottom: 12px; gap: 6px;">
          <button id="snoopy-tab-btn-bosque" class="snoopy-btn-tab snoopy-btn-sm active">🌲 MEU BOSQUE</button>
          <button id="snoopy-tab-btn-loja" class="snoopy-btn-tab snoopy-btn-sm">🏪 LOJINHA DE ÁRVORES</button>
          <button id="snoopy-tab-btn-guia" class="snoopy-btn-tab snoopy-btn-sm">📜 GUIA DE NÍVEIS</button>
        </div>

        <!-- Painel 1: Meu Bosque -->
        <div id="snoopy-panel-bosque" style="display: block;">
          <div style="background: #13131c; border: 1px solid rgba(74, 222, 128, 0.2); border-radius: 8px; padding: 12px 14px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #86efac; font-weight: 800;">Estágio Atual de Hoje</div>
              <div style="font-size: 15px; font-weight: 800; color: #ffffff; margin-top: 2px;">${estagioAtual.titulo} (${completedCyclesToday} ciclos • ${completedCyclesToday * focusMin}m)</div>
              <div class="snoopy-meta" style="font-size: 11px; color: #a1a1aa; margin-top: 2px;">${estagioAtual.fraseInspiradora || estagioAtual.descricao}</div>
            </div>
            <span class="snoopy-micro" style="padding: 3px 8px; border-radius: 4px; background: rgba(74, 222, 128, 0.15); color: #86efac; font-weight: 700; font-size: 11px;">${estagioAtual.badge}</span>
          </div>

          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #a1a1aa; font-weight: 700; margin-bottom: 8px;">Árvores Plantadas Hoje (${arvores.length})</div>
          <div id="snoopy-bosque-list" style="margin-bottom: 14px;">
            ${arvores.length > 0
              ? `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 8px;">
                  ${arvores.map(a => `
                    <div style="display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); padding: 8px 10px; border-radius: 6px;">
                      <div class="snoopy-bosque-icon" data-icon="${a.iconName}" data-color="${a.cor}" style="width: 26px; height: 26px; border-radius: 50%; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; flex-shrink: 0;"></div>
                      <div style="overflow: hidden;">
                        <div style="font-size: 11.5px; color: #ffffff; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${a.titulo}</div>
                        <div class="snoopy-micro" style="color: #a1a1aa; font-size: 10px;">${a.hora || 'Hoje'} • ${a.min}m</div>
                      </div>
                    </div>
                  `).join('')}
                </div>`
              : `<div class="snoopy-meta" style="font-size: 11.5px; color: #71717a; font-style: italic; padding: 16px 0; text-align: center;">Nenhuma árvore colhida hoje ainda. Inicie seu foco para plantar seu bosque!</div>`
            }
          </div>
        </div>

        <!-- Painel 2: Lojinha de Árvores & Sementes -->
        <div id="snoopy-panel-loja" style="display: none;">
          <div id="snoopy-loja-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; max-height: 340px; overflow-y: auto; padding-right: 4px;">
            ${renderCatalogoCards(storeData)}
          </div>
        </div>

        <!-- Painel 3: Guia de Níveis -->
        <div id="snoopy-panel-guia" style="display: none;">
          <div style="display: flex; flex-direction: column; gap: 8px; max-height: 320px; overflow-y: auto; padding-right: 4px;">
            ${guia.map((g) => {
              const isAtivo = g.titulo === estagioAtual.titulo;
              const borda = isAtivo ? 'border: 1px solid rgba(74, 222, 128, 0.4); background: rgba(74, 222, 128, 0.05);' : 'border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02);';
              const badgeCor = isAtivo ? 'background: rgba(74, 222, 128, 0.15); color: #86efac;' : 'background: rgba(255,255,255,0.06); color: #a1a1aa;';

              return `
                <div style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 8px; ${borda}">
                  <div class="snoopy-estufa-icon" data-icon="${g.iconName}" style="width: 34px; height: 34px; border-radius: 50%; background: #14141c; display: flex; align-items: center; justify-content: center; flex-shrink: 0;"></div>
                  <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span style="font-weight: 700; font-size: 13px; color: ${isAtivo ? '#86efac' : '#e4e4e7'};">${g.titulo}</span>
                      <span class="snoopy-micro" style="padding: 2px 6px; border-radius: 4px; ${badgeCor} font-weight: bold;">${g.ciclosMin === 0 ? 'Inicial' : `${g.ciclosMin}+ ciclos`}</span>
                    </div>
                    <div class="snoopy-meta" style="font-size: 11px; color: #a1a1aa; margin-top: 2px;">${g.descricao}</div>
                    ${g.lore ? `<div style="font-size: 10.5px; color: #71717a; font-style: italic; margin-top: 2px;">"${g.lore}"</div>` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `,
      onMontar: (modalBox, fechar) => {
        if (!modalBox) return;

        // 1. Fechar modal
        const closeBtn = modalBox.querySelector('.snoopy-modal-close');
        if (closeBtn) closeBtn.onclick = fechar;

        // 2. Renderiza ícones Lucide
        const renderIconsNoModal = () => {
          if (!renderIcon) return;
          const hIcon = modalBox.querySelector('#snoopy-modal-estufa-header-icon');
          if (hIcon) renderIcon(hIcon, 'trees', { size: 18, color: '#86efac' });

          modalBox.querySelectorAll('.snoopy-estufa-icon').forEach((el) => {
            const ic = el.getAttribute('data-icon');
            if (ic) renderIcon(el, ic, { size: 16, color: '#86efac' });
          });

          modalBox.querySelectorAll('.snoopy-bosque-icon').forEach((el) => {
            const ic = el.getAttribute('data-icon');
            const cor = el.getAttribute('data-color') || '#86efac';
            if (ic) renderIcon(el, ic, { size: 14, color: cor });
          });

          modalBox.querySelectorAll('.snoopy-loja-tree-icon').forEach((el) => {
            const ic = el.getAttribute('data-icon');
            const cor = el.getAttribute('data-color') || '#86efac';
            if (ic) renderIcon(el, ic, { size: 18, color: cor });
          });
        };
        renderIconsNoModal();

        // 3. Comutação de Abas
        const tabBosqueBtn = modalBox.querySelector('#snoopy-tab-btn-bosque');
        const tabLojaBtn = modalBox.querySelector('#snoopy-tab-btn-loja');
        const tabGuiaBtn = modalBox.querySelector('#snoopy-tab-btn-guia');

        const panelBosque = modalBox.querySelector('#snoopy-panel-bosque');
        const panelLoja = modalBox.querySelector('#snoopy-panel-loja');
        const panelGuia = modalBox.querySelector('#snoopy-panel-guia');

        const setTab = (tab) => {
          [tabBosqueBtn, tabLojaBtn, tabGuiaBtn].forEach(b => b && b.classList.remove('active'));
          if (panelBosque) panelBosque.style.display = (tab === 'bosque') ? 'block' : 'none';
          if (panelLoja) panelLoja.style.display = (tab === 'loja') ? 'block' : 'none';
          if (panelGuia) panelGuia.style.display = (tab === 'guia') ? 'block' : 'none';

          if (tab === 'bosque' && tabBosqueBtn) tabBosqueBtn.classList.add('active');
          if (tab === 'loja' && tabLojaBtn) tabLojaBtn.classList.add('active');
          if (tab === 'guia' && tabGuiaBtn) tabGuiaBtn.classList.add('active');
        };

        if (tabBosqueBtn) tabBosqueBtn.onclick = () => setTab('bosque');
        if (tabLojaBtn) tabLojaBtn.onclick = () => setTab('loja');
        if (tabGuiaBtn) tabGuiaBtn.onclick = () => setTab('guia');

        // 4. Interações da Lojinha: Comprar e Equipar
        const bindLojaBotoes = () => {
          modalBox.querySelectorAll('.btn-comprar-arvore').forEach((btn) => {
            btn.onclick = async () => {
              const id = btn.getAttribute('data-id');
              if (!id || !JardimStore || !app) return;
              const res = await JardimStore.comprarArvore(app, id);
              if (typeof Notice !== 'undefined') new Notice(res.mensagem);
              if (res.sucesso) {
                storeData = res.estado;
                const saldoEl = modalBox.querySelector('#snoopy-store-balance');
                if (saldoEl) saldoEl.textContent = `${storeData.moedas} 🪙`;
                const lojaGrid = modalBox.querySelector('#snoopy-loja-grid');
                if (lojaGrid) {
                  lojaGrid.innerHTML = renderCatalogoCards(storeData);
                  renderIconsNoModal();
                  bindLojaBotoes();
                }
                if (typeof onAtualizar === 'function') await onAtualizar(res.estado);
              }
            };
          });

          modalBox.querySelectorAll('.btn-equipar-arvore').forEach((btn) => {
            btn.onclick = async () => {
              const id = btn.getAttribute('data-id');
              if (!id || !JardimStore || !app) return;
              const res = await JardimStore.selecionarArvore(app, id);
              if (typeof Notice !== 'undefined') new Notice(`🌱 Árvore selecionada com sucesso!`);
              if (res.sucesso) {
                storeData = res.estado;
                const lojaGrid = modalBox.querySelector('#snoopy-loja-grid');
                if (lojaGrid) {
                  lojaGrid.innerHTML = renderCatalogoCards(storeData);
                  renderIconsNoModal();
                  bindLojaBotoes();
                }
                if (typeof onAtualizar === 'function') await onAtualizar(res.estado);
              }
            };
          });
        };
        bindLojaBotoes();
      }
    });

    return modalObj;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PomodoroJardim;
}

return PomodoroJardim;


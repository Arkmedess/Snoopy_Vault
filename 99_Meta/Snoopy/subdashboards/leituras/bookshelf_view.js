/**
 * Snoopy Vault - Submódulo: Visualização do Bookshelf (Leituras)
 * Implementa o Dashboard de Métricas de Leitura, The Shelf Grid (estante visual)
 * e o Reader's Studio Companion com Stepper de progresso, Rating de 5 estrelas,
 * caderno de anotações/citações e integração com matérias de estudos.
 *
 * @module subdashboards/leituras/bookshelf_view
 */

const BookshelfView = {
  /**
   * Cria uma capa tipográfica clássica para livros que não possuem imagem de capa.
   *
   * @param {object} livro - Objeto do livro.
   * @returns {HTMLElement} Elemento DOM da capa tipográfica.
   */
  criarCapaTipografica(livro) {
    const box = typeof document !== 'undefined'
      ? document.createElement('div')
      : { style: {}, innerHTML: '' };
    box.style.cssText = 'width: 100%; height: 100%; padding: 14px 10px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; border: 2px solid rgba(255,255,255,0.12); box-sizing: border-box; background: #1a1a26; font-family: var(--snoopy-font-sans);';
    box.innerHTML = `
      <div style="font-size: 11px; font-weight: 800; color: #ffffff; line-height: 1.25; margin-bottom: 6px; max-height: 60px; overflow: hidden;">
        ${livro.title || (livro.file ? livro.file.name : 'Livro')}
      </div>
      <div class="snoopy-meta" style="font-size: 9.5px; font-style: italic;">
        ${livro.author || 'Autor'}
      </div>
      <div style="margin-top: 10px; font-size: 10px; opacity: 0.4;">❖</div>
    `;
    return box;
  },

  /**
   * Renderiza a faixa consolidada de KPIs de Leitura no topo do Bookshelf.
   *
   * @param {HTMLElement} container - Elemento pai.
   * @param {Array<object>} listaLivros - Todos os livros cadastrados no acervo.
   * @param {object} [ctx] - Contexto compartilhado com renderIcon e utilitários.
   */
  renderReadingKpis(container, listaLivros = [], ctx = {}) {
    const totalAcervo = listaLivros.length;
    const lendoCount = listaLivros.filter(l => String(l.status).toLowerCase().includes('lendo')).length;
    const lidosCount = listaLivros.filter(l => String(l.status).toLowerCase().includes('lido')).length;
    const renderIconFn = ctx && typeof ctx.renderIcon === 'function' ? ctx.renderIcon : null;
    
    // Soma de páginas lidas
    const paginasLidas = listaLivros.reduce((acc, l) => {
      const cur = Number(l.current_page) || 0;
      return acc + cur;
    }, 0);

    // Média de avaliação
    const livrosAvaliados = listaLivros.filter(l => Number(l.rating) > 0);
    const mediaRating = livrosAvaliados.length > 0
      ? (livrosAvaliados.reduce((acc, l) => acc + Number(l.rating), 0) / livrosAvaliados.length).toFixed(1)
      : '0.0';

    const kpiBox = container.createEl('div', {
      attr: {
        style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-bottom: 20px;'
      }
    });

    const items = [
      { label: 'Acervo Total', val: `${totalAcervo}`, sub: 'livros cadastrados', icon: 'book' },
      { label: 'Lendo Agora', val: `${lendoCount}`, sub: 'em andamento', icon: 'book-open' },
      { label: 'Lidos', val: `${lidosCount}`, sub: `${totalAcervo > 0 ? Math.round((lidosCount / totalAcervo) * 100) : 0}% do acervo`, icon: 'check' },
      { label: 'Páginas Lidas', val: `${paginasLidas}`, sub: 'páginas no total', icon: 'bookmark' },
      { label: 'Média de Avaliação', val: `${mediaRating} ★`, sub: `${livrosAvaliados.length} avaliados`, icon: 'star' }
    ];

    items.forEach(it => {
      const card = kpiBox.createEl('div', {
        cls: 'snoopy-card-box',
        attr: {
          style: 'padding: 10px 14px; display: flex; flex-direction: column; gap: 4px; background: #0e0e14; border: 1px solid var(--snoopy-border); border-radius: 8px;'
        }
      });

      const topRow = card.createEl('div', {
        attr: { style: 'display: flex; justify-content: space-between; align-items: center;' }
      });
      topRow.createEl('span', { cls: 'snoopy-meta', text: it.label });

      if (renderIconFn && it.icon) {
        const iconContainer = topRow.createEl('span', { attr: { style: 'color: var(--text-muted); opacity: 0.7;' } });
        renderIconFn(iconContainer, it.icon, { size: 13 });
      }

      card.createEl('span', {
        attr: { style: 'font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;' },
        text: it.val
      });
      card.createEl('span', { cls: 'snoopy-micro', attr: { style: 'color: #71717a;' }, text: it.sub });
    });
  },

  /**
   * Renderiza a grade de livros na estante (The Shelf Grid).
   *
   * @param {HTMLElement} container - Elemento pai onde o grid será inserido.
   * @param {Array<object>} livrosFiltrados - Lista de livros filtrados por status/busca.
   * @param {object} livroDestaque - Livro atualmente em foco.
   * @param {object} ctx - Contexto compartilhado.
   * @param {Function} ctx.onSelectLivro - Callback chamado ao clicar em um livro da estante.
   */
  /**
   * Renderiza o Painel Retrátil de Desafios e Recomendações dos Estudos.
   *
   * @param {HTMLElement} container - Contêiner pai.
   * @param {Array<object>} listaLivros - Todos os livros do acervo.
   * @param {Array<object>} materiasEstudo - Matérias de 03_Estudos/.
   * @param {object} ctx - Contexto compartilhado.
   */
  renderDesafiosPainel(container, listaLivros = [], materiasEstudo = [], ctx = {}) {
    const gamificacaoEngine = ctx.gamificacao || (typeof require !== 'undefined' ? require('./gamificacao.js') : null);
    if (!gamificacaoEngine || typeof gamificacaoEngine.calcularDesafios !== 'function') return;

    const desafios = gamificacaoEngine.calcularDesafios(listaLivros);
    const recomendacoes = gamificacaoEngine.cruzarRecomendacoesEstudos(materiasEstudo, listaLivros);
    const { modais, onSelectLivro = () => {} } = ctx;

    const wrapper = container.createEl('div', {
      attr: {
        style: 'margin-bottom: 16px; background: #0d0d12; border: 1px solid var(--snoopy-border); border-radius: 8px; overflow: hidden;'
      }
    });

    const toggleBtn = wrapper.createEl('button', {
      cls: 'snoopy-btn-mode',
      attr: {
        style: 'width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; font-weight: 700; font-size: 11.5px; border: none; border-radius: 0; background: transparent; cursor: pointer;'
      }
    });

    toggleBtn.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="snoopy-section-title" style="font-size: 11px;">DESAFIOS DE LEITURA & RECOMENDAÇÕES</span>
        <span class="snoopy-micro" style="background: rgba(96, 165, 250, 0.12); color: #60a5fa; border: 1px solid rgba(96, 165, 250, 0.25); padding: 1px 6px; border-radius: 4px;">
          ${desafios.desafioAnual.concluidos}/${desafios.desafioAnual.meta} no ano
        </span>
      </div>
      <span id="desafios-caret" style="font-size: 12px; transition: transform 0.2s ease;">▾</span>
    `;

    const panelBody = wrapper.createEl('div', {
      attr: {
        style: 'display: none; padding: 14px; border-top: 1px solid var(--snoopy-border); background: #0e0e14;'
      }
    });

    let isAberto = false;
    toggleBtn.onclick = () => {
      isAberto = !isAberto;
      panelBody.style.display = isAberto ? 'grid' : 'none';
      const caret = toggleBtn.querySelector('#desafios-caret');
      if (caret) caret.style.transform = isAberto ? 'rotate(180deg)' : 'rotate(0deg)';
    };

    panelBody.style.cssText = 'display: none; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; padding: 14px; border-top: 1px solid var(--snoopy-border); background: #0e0e14;';

    // 1. Coluna Desafios Acionáveis
    const colDesafios = panelBody.createEl('div', {
      attr: { style: 'display: flex; flex-direction: column; gap: 10px;' }
    });

    const proximaAcao = desafios.desafioDiversidade && desafios.desafioDiversidade.proximaAcao ? desafios.desafioDiversidade.proximaAcao : null;
    const livroSug = proximaAcao && proximaAcao.livroSugeridoAcervo ? proximaAcao.livroSugeridoAcervo : null;
    const proximoTijolo = desafios.desafioTijolo && desafios.desafioTijolo.proximoTijolo ? desafios.desafioTijolo.proximoTijolo : null;

    colDesafios.innerHTML = `
      <div class="snoopy-section-title" style="font-size: 11px;">Desafios do Ano & Metas</div>
      
      <!-- Desafio Anual com Projeção -->
      <div style="background: #13131c; border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px;">
        <div style="display: flex; justify-content: space-between; font-size: 11px;">
          <span>Meta Anual: <strong>${desafios.desafioAnual.concluidos}/${desafios.desafioAnual.meta} livros</strong></span>
          <span style="font-weight: 700; color: #60a5fa;">${desafios.desafioAnual.pct}%</span>
        </div>
        <div class="snoopy-prog-track" style="height: 5px; width: 100%; border-radius: 99px;">
          <div class="snoopy-prog-fill" style="width: ${desafios.desafioAnual.pct}%; background: #60a5fa; border-radius: 99px;"></div>
        </div>
        <div class="snoopy-meta" style="font-size: 10px; color: #a1a1aa; margin-top: 2px;">
          Ritmo atual: previsão de ~${desafios.desafioAnual.projecaoFimAno || desafios.desafioAnual.concluidos} livros até Dezembro (${desafios.desafioAnual.statusRitmo || 'Em andamento'})
        </div>
      </div>

      <!-- Diversidade de Gêneros Acionável -->
      <div style="background: #13131c; border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px;">
        <div style="display: flex; justify-content: space-between; font-size: 11px;">
          <span>Diversidade de Gêneros: <strong>${desafios.desafioDiversidade.generosExplorados.length}/4</strong></span>
          <span style="color: ${desafios.desafioDiversidade.concluiuMeta ? '#86efac' : '#a1a1aa'}; font-size: 10px;">${desafios.desafioDiversidade.concluiuMeta ? 'Concluído ✓' : 'Em progresso'}</span>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 4px;">
          ${desafios.desafioDiversidade.generosExplorados.map(g => `
            <span class="snoopy-micro" style="background: rgba(134, 239, 172, 0.12); color: #86efac; border: 1px solid rgba(134, 239, 172, 0.3); padding: 2px 6px; border-radius: 3px;">✓ ${g}</span>
          `).join('')}
          ${desafios.desafioDiversidade.generosFaltantes.slice(0, 3).map(g => `
            <span class="snoopy-micro" style="background: rgba(255,255,255,0.04); color: #71717a; border: 1px solid rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 3px;">○ ${g}</span>
          `).join('')}
        </div>

        <!-- Próxima Ação Sugerida -->
        <div style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 6px; margin-top: 2px;">
          ${livroSug ? `
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <div style="overflow: hidden;">
                <div class="snoopy-micro" style="color: #60a5fa; font-weight: 700;">Próxima Leitura Recomendada (${proximaAcao.genero}):</div>
                <div style="font-size: 11.5px; font-weight: 700; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${livroSug.title}</div>
              </div>
              <button class="snoopy-btn-action snoopy-btn-sm btn-focar-sug-livro" style="flex-shrink: 0; font-size: 10px;">Ver Livro ↗</button>
            </div>
          ` : `
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <div class="snoopy-meta" style="font-size: 10.5px;">Explore <strong>${proximaAcao ? proximaAcao.genero : 'novos temas'}</strong> para diversificar:</div>
              <button class="snoopy-btn-primary snoopy-btn-sm btn-buscar-genero-nuvem" style="flex-shrink: 0; font-size: 10px;">+ Buscar Nuvem</button>
            </div>
          `}
        </div>
      </div>

      <!-- Obras Densas -->
      <div style="background: #13131c; border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; padding: 10px 12px; font-size: 11px;">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <span>Obras Densas (+350 págs):</span>
          <span style="font-weight: 700; color: #ffffff;">${desafios.desafioTijolo.lidosDensos} lidos / ${desafios.desafioTijolo.totalDensos} no acervo</span>
        </div>
        ${proximoTijolo ? `
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.05);">
            <div style="overflow: hidden;">
              <div class="snoopy-micro" style="color: #fdba74; font-weight: 700;">Próximo Tijolo no Acervo:</div>
              <div style="font-size: 11.5px; font-weight: 700; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${proximoTijolo.title} (${proximoTijolo.total_pages} págs)</div>
            </div>
            <button class="snoopy-btn-action snoopy-btn-sm btn-focar-tijolo" style="flex-shrink: 0; font-size: 10px;">Ver Livro ↗</button>
          </div>
        ` : ''}
      </div>
    `;

    const btnSugLivro = colDesafios.querySelector('.btn-focar-sug-livro');
    if (btnSugLivro && livroSug && livroSug.file) {
      btnSugLivro.onclick = () => onSelectLivro(livroSug.file.path);
    }

    const btnBuscarGenero = colDesafios.querySelector('.btn-buscar-genero-nuvem');
    if (btnBuscarGenero && modais && modais.abrirModalBuscaNuvem && proximaAcao) {
      btnBuscarGenero.onclick = () => modais.abrirModalBuscaNuvem(proximaAcao.genero);
    }

    const btnTijolo = colDesafios.querySelector('.btn-focar-tijolo');
    if (btnTijolo && proximoTijolo && proximoTijolo.file) {
      btnTijolo.onclick = () => onSelectLivro(proximoTijolo.file.path);
    }

    // 2. Coluna Recomendações dos Estudos
    const colRecom = panelBody.createEl('div', {
      attr: { style: 'display: flex; flex-direction: column; gap: 10px;' }
    });

    colRecom.innerHTML = `
      <div class="snoopy-section-title" style="font-size: 11px;">Recomendações dos Estudos</div>
    `;

    if (recomendacoes.recomendacoesAcervo.length === 0 && recomendacoes.materiasSemLivro.length === 0) {
      colRecom.createEl('div', {
        cls: 'snoopy-meta',
        attr: { style: 'font-size: 11px; padding: 10px 0;' },
        text: 'Nenhuma matéria ativa encontrada ou todas as disciplinas já possuem leituras vinculadas.'
      });
    } else {
      // Recomendações de livros do acervo
      recomendacoes.recomendacoesAcervo.slice(0, 2).forEach(rec => {
        const item = colRecom.createEl('div', {
          attr: {
            style: 'background: #13131c; border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; padding: 8px 10px; display: flex; justify-content: space-between; align-items: center; gap: 8px;'
          }
        });
        item.innerHTML = `
          <div style="overflow: hidden;">
            <div style="font-size: 10px; color: #60a5fa; font-weight: 700;">Estudo: ${rec.materia}</div>
            <div style="font-size: 12px; font-weight: 700; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${rec.livro.title}</div>
            <div class="snoopy-meta" style="font-size: 10px;">${rec.livro.author} • ${rec.livro.category}</div>
          </div>
          <button class="snoopy-btn-action snoopy-btn-sm btn-focar-recom" style="flex-shrink: 0; font-size: 10.5px;">Ver Livro ↗</button>
        `;
        const btn = item.querySelector('.btn-focar-recom');
        if (btn && rec.livro.file) {
          btn.onclick = () => onSelectLivro(rec.livro.file.path);
        }
      });

      // Matérias que não possuem livros
      recomendacoes.materiasSemLivro.slice(0, 2).forEach(sem => {
        const item = colRecom.createEl('div', {
          attr: {
            style: 'background: #13131c; border: 1px dashed rgba(255,255,255,0.12); border-radius: 6px; padding: 8px 10px; display: flex; justify-content: space-between; align-items: center; gap: 8px;'
          }
        });
        item.innerHTML = `
          <div>
            <div style="font-size: 11.5px; font-weight: 700; color: #ffffff;">${sem.materia}</div>
            <div class="snoopy-meta" style="font-size: 10px;">Sem bibliografia associada (${sem.area})</div>
          </div>
          <button class="snoopy-btn-primary snoopy-btn-sm btn-busca-recom" style="flex-shrink: 0; font-size: 10.5px;">+ Buscar Nuvem</button>
        `;
        const btn = item.querySelector('.btn-busca-recom');
        if (btn && modais && modais.abrirModalBuscaNuvem) {
          btn.onclick = () => modais.abrirModalBuscaNuvem(sem.materia);
        }
      });
    }
  },

  /**
   * Renderiza o bloco de Histórico & Constância de Leitura (30 Dias) idêntico à Home.
   *
   * @param {HTMLElement} container - Elemento pai onde o bloco será inserido.
   * @param {object} historico30Dias - Dados calculados ({ totalPaginas, weekPaginas, peakPaginas, streak, dias }).
   * @param {object} estagioLeitor - Objeto com { iconName, titulo, descricao, badge, pct }.
   * @param {object} [ctx] - Contexto compartilhado com renderIcon.
   */
  renderHistoricoConstancia(container, historico30Dias = {}, estagioLeitor = {}, ctx = {}) {
    const { totalPaginas = 0, weekPaginas = 0, peakPaginas = 0, streak = 0, dias = [] } = historico30Dias;
    const { iconName = 'book-open', titulo = 'Leitor Ativo', descricao = 'Constância em desenvolvimento.', badge = 'NÍVEL 1', pct = 0 } = estagioLeitor;
    const renderIconFn = ctx && typeof ctx.renderIcon === 'function' ? ctx.renderIcon : null;

    const historyBox = container.createEl('div', {
      cls: 'snoopy-card-box',
      attr: {
        style: 'background: #0d0d12; border: 1px solid var(--snoopy-border); border-radius: 8px; padding: 14px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px;'
      }
    });

    const historyHeader = historyBox.createEl('div', { cls: 'snoopy-card-header' });
    historyHeader.innerHTML = `
      <span class="snoopy-section-title">HISTÓRICO & CONSTÂNCIA DE LEITURA</span>
      <span id="snoopy-today-stats" class="snoopy-meta" style="color: #86efac; font-weight: bold;">${streak} dias seguidos (${totalPaginas} págs)</span>
    `;

    // Card de Nível do Leitor (estilo planta da Home)
    const levelCard = historyBox.createEl('div', {
      attr: { style: 'display: flex; align-items: center; gap: 14px; padding: 10px 14px; background: #13131c; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);' }
    });

    const avatarBox = levelCard.createEl('div', {
      attr: { style: 'width: 48px; height: 48px; border-radius: 50%; background: #181824; border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; color: #86efac; flex-shrink: 0;' }
    });
    if (renderIconFn) {
      renderIconFn(avatarBox, iconName, { size: 22, color: '#86efac' });
    } else if (typeof UIKit !== 'undefined' && UIKit.renderIcon) {
      UIKit.renderIcon(avatarBox, iconName || 'book-open', { size: 22, color: '#86efac' });
    }

    const levelInfo = levelCard.createEl('div', { attr: { style: 'flex: 1; overflow: hidden;' } });
    levelInfo.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 13.5px; font-weight: 700; color: #ffffff;">${titulo}</span>
        <span class="snoopy-micro" style="padding: 2px 7px; border-radius: 4px; background: rgba(74, 222, 128, 0.15); color: #86efac; font-weight: bold;">${badge}</span>
      </div>
      <div class="snoopy-meta" style="font-size: 11px; color: #a1a1aa; margin-top: 2px;">${descricao}</div>
      <div class="snoopy-prog-track" style="height: 6px; width: 100%; margin-top: 6px; border-radius: 99px;">
        <div class="snoopy-prog-fill" style="width: ${Math.min(100, pct)}%; background: #4ade80; border-radius: 99px;"></div>
      </div>
    `;

    // Grade de 30 Dias + Métricas Laterais
    const historySplit = historyBox.createEl('div', { attr: { style: 'padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.08);' } });
    historySplit.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span class="snoopy-sub-title">PÁGINAS LIDAS (ÚLTIMOS 30 DIAS)</span>
        <div class="snoopy-micro" style="display: flex; align-items: center; gap: 4px; color: #a1a1aa;">
          <span>0</span>
          <div class="snoopy-heat-cell heat-lvl-0"></div>
          <div class="snoopy-heat-cell heat-lvl-2"></div>
          <div class="snoopy-heat-cell heat-lvl-4"></div>
          <span>Meta+</span>
        </div>
      </div>
    `;

    const gridMetricsRow = historySplit.createEl('div', {
      attr: { style: 'display: grid; grid-template-columns: auto 1fr; gap: 18px; align-items: center;' }
    });

    const heatScroll = gridMetricsRow.createEl('div', { attr: { style: 'padding: 2px 0;' } });
    const heatGrid = heatScroll.createEl('div', { cls: 'snoopy-heat-grid' });

    dias.forEach(d => {
      heatGrid.createEl('div', {
        cls: `snoopy-heat-cell heat-lvl-${d.nivel}`,
        attr: {
          title: `${d.dataStr}: ${d.valor} páginas lidas`
        }
      });
    });

    const metricsSide = gridMetricsRow.createEl('div', {
      cls: 'snoopy-meta',
      attr: { style: 'background: #14141c; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px;' }
    });
    metricsSide.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <span style="color: #a1a1aa; font-size: 10.5px; text-transform: uppercase;">Na Semana:</span>
        <span id="metric-week" style="font-weight: 800; color: #ffffff; font-size: 13px;">${weekPaginas} págs</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: baseline; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.05);">
        <span style="color: #a1a1aa; font-size: 10.5px; text-transform: uppercase;">Maior Leitura:</span>
        <span id="metric-peak" style="font-weight: 800; color: #ffffff; font-size: 13px;">${peakPaginas} págs</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: baseline; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.05);">
        <span style="color: #a1a1aa; font-size: 10.5px; text-transform: uppercase;">Sequência:</span>
        <span id="metric-streak" style="font-weight: 800; color: #ffffff; font-size: 13px;">${streak} dias</span>
      </div>
    `;
  },

  /**
   * Renderiza o grid de livros (The Shelf Grid) com densidade otimizada.
   *
   * @param {HTMLElement} container - Contêiner pai.
   * @param {Array<object>} livrosFiltrados - Lista de livros filtrados.
   * @param {object} livroDestaque - Livro atualmente em foco.
   * @param {object} ctx - Contexto compartilhado.
   * @param {Function} ctx.onSelectLivro - Callback chamado ao clicar em um livro da estante.
   */
  renderShelfGrid(container, livrosFiltrados = [], livroDestaque = null, ctx = {}) {
    const { onSelectLivro = () => {} } = ctx;

    if (livrosFiltrados.length === 0) {
      container.innerHTML = `
        <div class="snoopy-meta" style="text-align: center; padding: 40px 0;">
          Nenhum livro encontrado com os filtros atuais.
        </div>
      `;
      return;
    }

    const gridShelf = container.createEl('div', {
      cls: 'snoopy-shelf-grid',
      attr: {
        style: 'display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 16px;'
      }
    });

    livrosFiltrados.forEach(b => {
      const isSelecionado = livroDestaque && b.file && livroDestaque.file && b.file.path === livroDestaque.file.path;
      const cur = Number(b.current_page) || 0;
      const tot = Number(b.total_pages) || 100;
      const pct = tot > 0 ? Math.round((cur / tot) * 100) : 0;
      const statusStr = String(b.status || '').toLowerCase();
      const isLido = statusStr.includes('lido') || pct >= 100;
      const isSintetizando = statusStr.includes('sintetiz');

      const bookItem = gridShelf.createEl('div', {
        cls: `snoopy-shelf-card ${isSelecionado ? 'selected' : ''}`.trim(),
        attr: {
          style: `display: flex; flex-direction: column; cursor: pointer; position: relative; border-radius: var(--snoopy-radius-md, 8px); padding: 5px; transition: transform 0.15s ease, background-color 0.15s ease, border-color 0.15s ease; ${isSelecionado ? 'outline: 2px solid var(--interactive-accent, #60a5fa); background: rgba(96, 165, 250, 0.08);' : 'background: transparent;'}`
        }
      });

      bookItem.onclick = () => {
        if (b.file) onSelectLivro(b.file.path);
      };

      const coverWrapper = bookItem.createEl('div', {
        cls: 'snoopy-shelf-cover-box'
      });

      if (b.cover && b.cover.startsWith('http')) {
        const img = coverWrapper.createEl('img', {
          attr: {
            loading: 'lazy',
            decoding: 'async',
            style: 'width: 100%; height: 100%; object-fit: cover;'
          }
        });
        img.src = b.cover;
        img.onerror = () => {
          img.style.display = 'none';
          coverWrapper.appendChild(BookshelfView.criarCapaTipografica(b));
        };
      } else {
        coverWrapper.appendChild(BookshelfView.criarCapaTipografica(b));
      }

      // Ribbons
      if (isLido) {
        const ribbon = coverWrapper.createEl('div', {
          cls: 'snoopy-shelf-ribbon-done',
          attr: {
            style: 'position: absolute; top: 0; right: 8px; width: 22px; height: 26px; background: #86efac; color: #000; font-size: 11px; font-weight: bold; display: flex; align-items: center; justify-content: center; clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 75%, 0 100%); z-index: 5;'
          }
        });
        if (ctx.renderIcon) {
          ctx.renderIcon(ribbon, 'check', { size: 12, color: '#000000' });
        }
      } else if (isSintetizando) {
        coverWrapper.createEl('div', {
          cls: 'snoopy-shelf-badge-notes',
          attr: {
            style: 'position: absolute; top: 6px; right: 6px; background: #fdba74; color: #000; font-size: 9px; font-weight: 800; padding: 2px 5px; border-radius: var(--snoopy-radius-xs, 4px); z-index: 5;'
          },
          text: 'NOTAS'
        });
      } else if (b.status && String(b.status).toLowerCase().includes('lendo')) {
        coverWrapper.createEl('div', {
          cls: 'snoopy-shelf-badge-reading',
          attr: {
            style: 'position: absolute; bottom: 6px; left: 6px; background: rgba(0,0,0,0.75); color: #60a5fa; font-size: 9px; font-weight: 700; padding: 2px 5px; border-radius: var(--snoopy-radius-xs, 4px); z-index: 5;'
          },
          text: 'LENDO'
        });
      }

      // Botão de Três Pontinhos (Ações Rápidas)
      const btnDots = coverWrapper.createEl('button', {
        cls: 'snoopy-btn-icon snoopy-btn-sm',
        attr: {
          style: 'position: absolute; top: 6px; left: 6px; width: 22px; height: 22px; min-width: 22px; padding: 0; background: rgba(0,0,0,0.75); border: 1px solid rgba(255,255,255,0.2); border-radius: var(--snoopy-radius-xs, 4px); color: #ffffff; display: flex; align-items: center; justify-content: center; z-index: 10; cursor: pointer;',
          title: 'Ações do Livro'
        },
        text: '⋮'
      });
      if (ctx && typeof ctx.renderIcon === 'function') {
        btnDots.innerHTML = '';
        ctx.renderIcon(btnDots, 'more-vertical', { size: 12 });
      }

      btnDots.onclick = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();

        const menuExistente = typeof document !== 'undefined' ? document.querySelector('.snoopy-shelf-popover') : null;
        if (menuExistente && menuExistente.parentNode) {
          menuExistente.parentNode.removeChild(menuExistente);
        }

        const popover = typeof document !== 'undefined' ? document.createElement('div') : coverWrapper.createEl('div');
        popover.className = 'snoopy-shelf-popover';
        popover.style.cssText = 'position: absolute; top: 32px; left: 6px; background: #0d0d12; border: 1px solid rgba(255,255,255,0.18); border-radius: 6px; padding: 6px; display: flex; flex-direction: column; gap: 4px; z-index: 99; min-width: 140px;';

        popover.innerHTML = `
          <button id="pop-prog" class="snoopy-btn-action snoopy-btn-sm" style="text-align: left; width: 100%;">Atualizar Páginas</button>
          <button id="pop-edit" class="snoopy-btn-action snoopy-btn-sm" style="text-align: left; width: 100%;">Editar Metadados</button>
          <button id="pop-del" class="snoopy-btn-danger snoopy-btn-sm" style="text-align: left; width: 100%;">Excluir Livro</button>
        `;

        coverWrapper.appendChild(popover);

        const fecharMenu = (ev) => {
          if (!popover.contains(ev.target) && ev.target !== btnDots) {
            if (popover.parentNode) popover.parentNode.removeChild(popover);
            if (typeof document !== 'undefined') document.removeEventListener('click', fecharMenu);
          }
        };
        setTimeout(() => {
          if (typeof document !== 'undefined') document.addEventListener('click', fecharMenu);
        }, 20);

        const popProg = popover.querySelector('#pop-prog');
        if (popProg && modais && modais.abrirModalProgresso) {
          popProg.onclick = (ev) => {
            if (ev && ev.stopPropagation) ev.stopPropagation();
            if (popover.parentNode) popover.parentNode.removeChild(popover);
            modais.abrirModalProgresso(b);
          };
        }

        const popEdit = popover.querySelector('#pop-edit');
        if (popEdit && modais && modais.abrirModalEditarMetadados) {
          popEdit.onclick = (ev) => {
            if (ev && ev.stopPropagation) ev.stopPropagation();
            if (popover.parentNode) popover.parentNode.removeChild(popover);
            modais.abrirModalEditarMetadados(b);
          };
        }

        const popDel = popover.querySelector('#pop-del');
        if (popDel && modais && modais.abrirModalConfirmarExclusao) {
          popDel.onclick = (ev) => {
            if (ev && ev.stopPropagation) ev.stopPropagation();
            if (popover.parentNode) popover.parentNode.removeChild(popover);
            modais.abrirModalConfirmarExclusao(b);
          };
        }
      };


      // Barra de Progresso Embutida
      const baseProgress = coverWrapper.createEl('div', {
        attr: {
          style: 'position: absolute; bottom: 0; left: 0; right: 0; height: 5px; background: rgba(0,0,0,0.6);'
        }
      });
      baseProgress.createEl('div', {
        attr: {
          style: `height: 100%; width: ${pct}%; background: ${isLido ? '#86efac' : '#ffffff'};`
        }
      });

      // Legenda
      const metaBottom = bookItem.createEl('div', { attr: { style: 'margin-top: 8px; display: flex; flex-direction: column; gap: 2px;' } });
      metaBottom.createEl('span', {
        text: b.title || (b.file ? b.file.name : 'Livro'),
        attr: { style: 'font-size: 12px; font-weight: 700; color: var(--text-normal); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;' }
      });
      metaBottom.createEl('span', {
        text: b.author || 'Autor desconhecido',
        attr: { class: 'snoopy-meta', style: 'font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;' }
      });
      const bCats = Array.isArray(b.categories) && b.categories.length > 0
        ? b.categories
        : (b.category ? [b.category] : []);
      if (bCats.length > 0) {
        metaBottom.createEl('span', {
          text: bCats.slice(0, 2).join(' • '),
          attr: { class: 'snoopy-micro', style: 'color: var(--text-muted); font-size: 9.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px;' }
        });
      }
    });
  },

  /**
   * Renderiza o Reader's Studio Companion (painel completo do livro em foco).
   *
   * @param {HTMLElement} container - Elemento pai.
   * @param {object} livroDestaque - Livro em foco.
   * @param {object} ctx - Contexto compartilhado.
   */
  async renderReaderCompanion(container, livroDestaque, ctx = {}) {
    if (!livroDestaque) {
      container.innerHTML = `
        <div style="background: #0d0d12; border: 1px dashed var(--snoopy-border); border-radius: 8px; padding: 40px 20px; text-align: center; color: var(--text-muted);">
          <div style="font-weight: 700; font-size: 13.5px; color: #ffffff;">Nenhum Livro Selecionado</div>
          <div class="snoopy-meta" style="margin-top: 4px;">Selecione um livro na estante ao lado para abrir detalhes, lições e progresso.</div>
        </div>
      `;
      return;
    }

    const { app, modais, materiasEstudo = [], renderIcon } = ctx;
    const cur = Number(livroDestaque.current_page) || 0;
    const tot = Number(livroDestaque.total_pages) || 100;
    const pct = tot > 0 ? Math.round((cur / tot) * 100) : 0;
    const paginasRestantes = Math.max(0, tot - cur);
    const horasRestantes = (paginasRestantes * 1.5 / 60).toFixed(1);
    const ratingAtual = Number(livroDestaque.rating) || 0;

    // Extração das notas do arquivo markdown
    let dadosMarkdown = { sinopse: '', licoes: [], reflexoes: [], estudosVinculados: [] };
    if (app && app.vault && livroDestaque.file) {
      try {
        const f = app.vault.getAbstractFileByPath(livroDestaque.file.path);
        if (f) {
          const raw = await app.vault.read(f);
          if (modais && modais.constructor && modais.constructor.extrairDadosLivro) {
            dadosMarkdown = modais.constructor.extrairDadosLivro(raw);
          } else {
            const matchLicoes = raw.match(/##\s*Principais Lições[^\n]*\n+([\s\S]*?)(?=\n##|\n---|$)/i) || raw.match(/##\s*💡\s*Principais Lições[^\n]*\n+([\s\S]*?)(?=\n##|\n---|$)/i);
            if (matchLicoes) {
              dadosMarkdown.licoes = matchLicoes[1].split('\n').filter(l => l.trim().startsWith('- ')).map(l => l.trim().replace(/^- \s*/, ''));
            }
            const matchEstudos = raw.match(/\[\[([^\]]+)\]\]/g);
            if (matchEstudos) {
              dadosMarkdown.estudosVinculados = matchEstudos.map(l => l.replace(/[\[\]]/g, '').trim()).filter(l => !l.includes('Home'));
            }
          }
        }
      } catch (err) {
        console.error('[BookshelfView] Falha ao extrair dados do livro:', err);
      }
    }

    const companionCard = container.createEl('div', {
      cls: 'snoopy-card-box',
      attr: {
        style: 'background: #0d0d12; border: 1px solid var(--snoopy-border); border-radius: var(--snoopy-radius-md, 8px); padding: 20px; display: flex; flex-direction: column; gap: 16px;'
      }
    });

    // 1. Cabeçalho com Capa e Metadados Principais
    const headerRow = companionCard.createEl('div', {
      attr: { style: 'display: grid; grid-template-columns: 100px 1fr; gap: 16px; align-items: start;' }
    });

    const coverBox = headerRow.createEl('div');
    const cImg = coverBox.createEl('img', {
      attr: {
        loading: 'lazy',
        style: 'width: 100px; height: 148px; border-radius: 6px; object-fit: cover; border: 1px solid var(--snoopy-border);'
      }
    });
    cImg.src = livroDestaque.cover || "https://images.pexels.com/photos/10254198/pexels-photo-10254198.jpeg";
    cImg.onerror = () => { cImg.src = "https://images.pexels.com/photos/10254198/pexels-photo-10254198.jpeg"; };

    const infoBox = headerRow.createEl('div', {
      attr: { style: 'display: flex; flex-direction: column; gap: 6px; overflow: hidden;' }
    });

    infoBox.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
        <div style="overflow: hidden;">
          <div class="snoopy-section-title" style="font-size: 15px; font-weight: 700; color: #ffffff; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${livroDestaque.title || (livroDestaque.file ? livroDestaque.file.name : 'Livro')}
          </div>
          <div style="font-size: 12px; font-style: italic; color: #a1a1aa; margin-top: 2px;">
            ${livroDestaque.author || 'Autor desconhecido'}
          </div>
        </div>
        <span class="snoopy-micro" style="padding: 2px 7px; border-radius: 4px; background: rgba(255, 255, 255, 0.05); color: #e4e4e7; border: 1px solid rgba(255, 255, 255, 0.08); font-size: 10px; font-weight: 600; flex-shrink: 0; letter-spacing: 0.03em;">
          ${livroDestaque.status || 'Quero ler'}
        </span>
      </div>

      <!-- Tags de Gêneros Interativas -->
      <div id="companion-genres-row" style="display: flex; flex-wrap: wrap; gap: 5px; align-items: center; margin-top: 2px;">
        ${(Array.isArray(livroDestaque.categories) && livroDestaque.categories.length > 0 ? livroDestaque.categories : [livroDestaque.category || 'Geral']).map(g => `
          <span class="snoopy-chip snoopy-chip-muted" style="font-size: 11px; padding: 2px 7px;">
            <span>${g}</span>
            <button class="btn-del-genre snoopy-chip-del" data-genre="${String(g).replace(/"/g, '&quot;')}" title="Remover tema ${g}">✕</button>
          </span>
        `).join('')}
        <button id="btn-add-genre-chip" class="snoopy-btn-action snoopy-btn-sm" style="font-size: 9.5px; padding: 1px 6px;" title="Adicionar tema a este livro">+ Tema</button>
      </div>

      <!-- Rating por Estrelas Interativo (Design Sóbrio Monocromático) -->
      <div id="companion-star-rating" style="display: flex; gap: 3px; align-items: center; margin-top: 2px; cursor: pointer;">
        <span class="snoopy-micro" style="color: #a1a1aa; margin-right: 2px;">Avaliação:</span>
        ${[1, 2, 3, 4, 5].map(star => `
          <span class="star-btn" data-star="${star}" style="font-size: 14px; color: ${star <= ratingAtual ? '#e4e4e7' : 'rgba(255,255,255,0.15)'}; transition: color 0.12s ease;">★</span>
        `).join('')}
      </div>

      <!-- Toolbar de Ações do Livro (Clean, sem contraste excessivo) -->
      <div class="snoopy-toolbar" style="margin-top: 8px; gap: 8px; display: flex; flex-wrap: wrap; align-items: center;">
        <button id="btn-step-open-file" class="snoopy-btn-action snoopy-btn-sm" title="Abrir nota do livro no Obsidian">Abrir Nota</button>
        <button id="btn-foco-pomodoro" class="snoopy-btn-action snoopy-btn-sm" title="Direcionar Pomodoro da Home para este livro">Foco na Home</button>
        <button id="btn-edit-metadados" class="snoopy-btn-action snoopy-btn-sm" title="Editar dados da obra">Editar</button>
        <button id="btn-trash-book" class="snoopy-btn-action snoopy-btn-sm" title="Excluir livro da estante"></button>
      </div>
    `;

    // Handlers do cabeçalho
    infoBox.querySelectorAll('.btn-del-genre').forEach(btn => {
      btn.onclick = async (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        const genNome = btn.getAttribute('data-genre');
        if (modais && modais.removerGenero && genNome) {
          await modais.removerGenero(livroDestaque, genNome);
        }
      };
    });

    const btnAddGenre = infoBox.querySelector('#btn-add-genre-chip');
    if (btnAddGenre && modais && modais.abrirModalAdicionarGenero) {
      btnAddGenre.onclick = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        modais.abrirModalAdicionarGenero(livroDestaque);
      };
    }

    const btnEditMeta = infoBox.querySelector('#btn-edit-metadados');
    if (btnEditMeta && modais && modais.abrirModalEditarMetadados) {
      btnEditMeta.onclick = () => modais.abrirModalEditarMetadados(livroDestaque);
    }

    // Botão de Foco: Integração com o Pomodoro Central da Home
    const btnFoco = infoBox.querySelector('#btn-foco-pomodoro');
    if (btnFoco) {
      if (renderIcon && typeof renderIcon === 'function') {
        const txt = btnFoco.innerText || 'Foco na Home';
        btnFoco.innerHTML = '';
        renderIcon(btnFoco, 'target', { size: 12, cls: 'btn-icon-pad' });
        btnFoco.createEl('span', { text: ` ${txt.trim()}` });
      }
      // Se houver foco rodando na Home, sinaliza
      const pomoGlobal = typeof window !== 'undefined' ? window.__snoopyPomodoroState : null;
      if (pomoGlobal && pomoGlobal.isRunning) {
        btnFoco.style.borderColor = '#86efac';
        btnFoco.style.color = '#86efac';
      }

      btnFoco.onclick = () => {
        const titulo = livroDestaque.title || 'Leitura';
        const tarefaFoco = `Leitura: ${titulo}`;

        if (typeof window !== 'undefined') {
          if (!window.__snoopyPomodoroState) {
            window.__snoopyPomodoroState = {
              isRunning: false,
              endAt: null,
              remainingSeconds: 25 * 60,
              currentMode: 'foco',
              alvoAtual: tarefaFoco
            };
          } else {
            window.__snoopyPomodoroState.alvoAtual = tarefaFoco;
          }
        }

        if (ctx.events && typeof ctx.events.emit === 'function') {
          ctx.events.emit('pomodoro:focar', { tarefa: tarefaFoco });
        }
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('pomodoro:focar', { detail: { tarefa: tarefaFoco } }));
        }

        if (typeof Notice !== 'undefined') {
          new Notice(`[Snoopy] Alvo do Pomodoro definido: "${titulo}"! Abra a Home para acompanhar o temporizador.`);
        }
      };
    }

    const btnOpenFile = infoBox.querySelector('#btn-step-open-file');
    if (btnOpenFile) {
      if (ctx.renderIcon && typeof ctx.renderIcon === 'function') {
        btnOpenFile.innerHTML = '';
        ctx.renderIcon(btnOpenFile, 'external-link', { size: 12, cls: 'btn-icon-pad' });
        btnOpenFile.createEl('span', { text: ' Abrir Nota' });
      }
      btnOpenFile.onclick = () => {
        if (app && app.workspace && livroDestaque.file) {
          app.workspace.openLinkText(livroDestaque.file.path, "", false);
        }
      };
    }

    const btnTrashBook = infoBox.querySelector('#btn-trash-book');
    if (btnTrashBook) {
      if (ctx.renderIcon) {
        ctx.renderIcon(btnTrashBook, 'trash-2', { size: 12, color: 'var(--text-muted, #a1a1aa)' });
      } else {
        btnTrashBook.textContent = 'Excluir';
      }
      if (modais && modais.abrirModalConfirmarExclusao) {
        btnTrashBook.onclick = () => modais.abrirModalConfirmarExclusao(livroDestaque);
      }
    }

    const starsContainer = infoBox.querySelector('#companion-star-rating');
    if (starsContainer && modais && modais.atualizarRating) {
      starsContainer.querySelectorAll('.star-btn').forEach(s => {
        s.onclick = () => {
          const val = Number(s.getAttribute('data-star')) || 0;
          modais.atualizarRating(livroDestaque, val);
        };
      });
    }

    // =========================================================================
    // 2. ABAS SEGMENTADAS DO READER COMPANION
    // =========================================================================
    const tabsBar = companionCard.createEl('div', {
      cls: 'snoopy-toolbar',
      attr: {
        style: 'border-top: 1px solid var(--snoopy-border); border-bottom: 1px solid var(--snoopy-border); padding: 8px 0; gap: 4px; overflow-x: auto;'
      }
    });

    let abaCompanionAtiva = 'progresso'; // 'progresso' | 'notas' | 'estudos' | 'sinopse'

    const abasCompanionConfig = [
      { id: 'progresso', label: 'Progresso & Foco' },
      { id: 'notas', label: `Notas & Citações (${dadosMarkdown.licoes.length})` },
      { id: 'estudos', label: `Estudos (${dadosMarkdown.estudosVinculados.length})` },
      { id: 'sinopse', label: 'Sinopse & Ficha' }
    ];

    const tabButtonsMap = {};
    abasCompanionConfig.forEach(aba => {
      const btnTab = tabsBar.createEl('button', {
        cls: `snoopy-btn-tab snoopy-btn-sm ${aba.id === abaCompanionAtiva ? 'active' : ''}`,
        text: aba.label
      });
      tabButtonsMap[aba.id] = btnTab;
      btnTab.onclick = () => {
        abaCompanionAtiva = aba.id;
        Object.keys(tabButtonsMap).forEach(k => {
          if (k === aba.id) tabButtonsMap[k].classList.add('active');
          else tabButtonsMap[k].classList.remove('active');
        });
        atualizarExibicaoAbas();
      };
    });

    const contentContainer = companionCard.createEl('div', {
      attr: { style: 'display: flex; flex-direction: column; gap: 12px;' }
    });

    // -------------------------------------------------------------------------
    // ABA 1: PROGRESSO & FOCO
    // -------------------------------------------------------------------------
    const panelProgresso = contentContainer.createEl('div', { attr: { id: 'panel-companion-progresso' } });

    // Stepper & Barra de Progresso
    const progBox = panelProgresso.createEl('div', {
      attr: { style: 'background: #12121a; border: 1px solid var(--snoopy-border); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px;' }
    });

    progBox.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <span style="font-size: 14px; font-weight: 800; color: #ffffff;">${pct}% concluído</span>
        <span class="snoopy-meta" style="font-size: 11px; color: #a1a1aa;">
          ${cur}/${tot} págs • Restam ~${horasRestantes}h (${paginasRestantes} págs)
        </span>
      </div>
      <div class="snoopy-prog-track" style="height: 6px; width: 100%; border-radius: 99px;">
        <div class="snoopy-prog-fill" style="width: ${pct}%; background: #86efac; border-radius: 99px;"></div>
      </div>

      <div class="snoopy-toolbar" style="margin-top: 4px; justify-content: space-between;">
        <div class="snoopy-toolbar">
          <button id="btn-step-5" class="snoopy-btn-action snoopy-btn-sm" title="Adicionar 5 páginas lidas">+5</button>
          <button id="btn-step-10" class="snoopy-btn-action snoopy-btn-sm" title="Adicionar 10 páginas lidas">+10</button>
          <button id="btn-step-edit" class="snoopy-btn-action snoopy-btn-sm">Páginas</button>
        </div>
        <span class="snoopy-micro" style="color: #71717a;">Ritmo contínuo</span>
      </div>
    `;

    const btnStep5 = progBox.querySelector('#btn-step-5');
    if (btnStep5 && modais && modais.incrementarPaginas) {
      btnStep5.onclick = () => modais.incrementarPaginas(livroDestaque, 5);
    }
    const btnStep10 = progBox.querySelector('#btn-step-10');
    if (btnStep10 && modais && modais.incrementarPaginas) {
      btnStep10.onclick = () => modais.incrementarPaginas(livroDestaque, 10);
    }
    const btnStepEdit = progBox.querySelector('#btn-step-edit');
    if (btnStepEdit && modais && modais.abrirModalProgresso) {
      btnStepEdit.onclick = () => modais.abrirModalProgresso(livroDestaque);
    }

    // Card de Ofensiva e Meta Diária Compacto
    const gamificacaoEngine = ctx.gamificacao || null;
    const metaDiaria = Number(ctx.metaDiariaPaginas || ctx.metaDiaria) || 25;
    let dadosOfensiva = { streakAtual: 0, recordeStreak: 0, historico7Dias: [] };
    let progressoMeta = { meta: metaDiaria, paginasHoje: 0, porcentagem: 0, batida: false, diasParaTermino: 0 };

    if (gamificacaoEngine && typeof gamificacaoEngine.calcularOfensiva === 'function') {
      dadosOfensiva = gamificacaoEngine.calcularOfensiva(ctx.notasDiarias || [], ctx.todayStr || '', metaDiaria);
      const hojeStr = ctx.todayStr || '';
      const itemHoje = dadosOfensiva.historico7Dias.find(d => d.data === hojeStr);
      const pagHoje = itemHoje ? itemHoje.paginas : 0;
      progressoMeta = gamificacaoEngine.calcularProgressoMeta(pagHoje, metaDiaria, paginasRestantes);
    }

    const streakBox = panelProgresso.createEl('div', {
      attr: { style: 'background: #12121a; border: 1px solid var(--snoopy-border); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px; margin-top: 10px;' }
    });

    streakBox.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <span class="snoopy-section-title" style="font-size: 11px; letter-spacing: 0.04em;">OFENSIVA: ${dadosOfensiva.streakAtual} DIAS SEGUIDOS</span>
        <span class="snoopy-meta" style="font-size: 10px; color: #a1a1aa;">Recorde: ${dadosOfensiva.recordeStreak} dias</span>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 2px;">
        <span style="font-size: 11.5px; font-weight: 700; color: #ffffff;">Meta Diária: ${progressoMeta.paginasHoje}/${progressoMeta.meta} págs (${progressoMeta.porcentagem}%)</span>
        <button id="btn-edit-meta-diaria" class="snoopy-btn-action snoopy-btn-sm" style="font-size: 9.5px; padding: 1px 6px;">Editar Meta</button>
      </div>

      <div class="snoopy-prog-track" style="height: 5px; width: 100%; border-radius: 99px;">
        <div class="snoopy-prog-fill" style="width: ${progressoMeta.porcentagem}%; background: ${progressoMeta.batida ? '#86efac' : '#60a5fa'}; border-radius: 99px;"></div>
      </div>

      <div class="snoopy-meta" style="font-size: 10.5px; color: #a1a1aa;">
        ${progressoMeta.diasParaTermino > 0
          ? `Ao ritmo de ${progressoMeta.meta} págs/dia, você concluirá este livro em ~${progressoMeta.diasParaTermino} dias.`
          : 'Meta diária alcançada hoje!'}
      </div>
    `;

    const btnEditMetaDiaria = streakBox.querySelector('#btn-edit-meta-diaria');
    if (btnEditMetaDiaria && modais && modais.abrirModalEditarMetaDiaria) {
      btnEditMetaDiaria.onclick = () => {
        modais.abrirModalEditarMetaDiaria(metaDiaria, (nova) => {
          if (ctx.onDefinirMetaDiaria) ctx.onDefinirMetaDiaria(nova);
        });
      };
    }

    // -------------------------------------------------------------------------
    // ABA 2: NOTAS & CITAÇÕES
    // -------------------------------------------------------------------------
    const panelNotas = contentContainer.createEl('div', { attr: { id: 'panel-companion-notas' } });

    const notesHeader = panelNotas.createEl('div', {
      attr: { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;' }
    });
    notesHeader.innerHTML = `
      <span class="snoopy-section-title" style="font-size: 11.5px;">Lições e Citações (${dadosMarkdown.licoes.length})</span>
      <button id="btn-quick-note-action" class="snoopy-btn-primary snoopy-btn-sm">+ Nova Citação</button>
    `;

    const btnQuickNote = notesHeader.querySelector('#btn-quick-note-action');
    if (btnQuickNote && modais && modais.abrirModalNovaAnotacao) {
      btnQuickNote.onclick = () => modais.abrirModalNovaAnotacao(livroDestaque);
    }

    const notesList = panelNotas.createEl('div', {
      attr: { style: 'max-height: 240px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-right: 4px;' }
    });

    if (dadosMarkdown.licoes.length === 0) {
      notesList.innerHTML = `
        <div class="snoopy-meta" style="font-size: 11px; text-align: center; padding: 20px 0; color: #71717a;">
          Nenhuma lição ou citação registrada. Clique em "+ Nova Citação" para adicionar passagens marcantes.
        </div>
      `;
    } else {
      dadosMarkdown.licoes.forEach(licao => {
        const quoteCard = notesList.createEl('div', {
          attr: {
            style: 'background: #12121a; border-left: 3px solid #60a5fa; border-radius: 4px; padding: 8px 10px; font-size: 12px; color: #e4e4e7; line-height: 1.4; display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;'
          }
        });

        quoteCard.createEl('div', {
          attr: { style: 'font-style: italic; flex: 1;' },
          text: `“${licao}”`
        });

        const btnDelQuote = quoteCard.createEl('button', {
          cls: 'snoopy-btn-danger snoopy-btn-sm',
          attr: {
            style: 'padding: 2px 6px; font-size: 10px; line-height: 1; flex-shrink: 0;',
            title: 'Excluir esta citação'
          }
        });
        if (ctx.renderIcon) {
          ctx.renderIcon(btnDelQuote, 'trash-2', { size: 10, color: '#f87171' });
        } else {
          btnDelQuote.textContent = 'x';
        }

        if (modais && modais.removerAnotacao) {
          btnDelQuote.onclick = async (e) => {
            if (e && e.stopPropagation) e.stopPropagation();
            await modais.removerAnotacao(livroDestaque, licao);
          };
        }
      });
    }

    // -------------------------------------------------------------------------
    // ABA 3: ESTUDOS VINCULADOS
    // -------------------------------------------------------------------------
    const panelEstudos = contentContainer.createEl('div', { attr: { id: 'panel-companion-estudos' } });

    const estudosHeader = panelEstudos.createEl('div', {
      attr: { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;' }
    });
    estudosHeader.innerHTML = `
      <span class="snoopy-section-title" style="font-size: 11.5px;">Matérias de Estudo Vinculadas</span>
      <button id="btn-vincular-estudo-action" class="snoopy-btn-action snoopy-btn-sm">+ Vincular Matéria</button>
    `;

    const btnVincular = estudosHeader.querySelector('#btn-vincular-estudo-action');
    if (btnVincular && modais && modais.abrirModalVincularEstudo) {
      btnVincular.onclick = () => modais.abrirModalVincularEstudo(livroDestaque, materiasEstudo);
    }

    const estudosChips = panelEstudos.createEl('div', {
      attr: { style: 'display: flex; flex-wrap: wrap; gap: 6px;' }
    });

    const vinculados = dadosMarkdown.estudosVinculados || [];
    if (vinculados.length === 0) {
      estudosChips.innerHTML = `<span class="snoopy-meta" style="font-size: 11px; color: #71717a;">Nenhuma matéria de estudo de 03_Estudos/ vinculada a esta leitura.</span>`;
    } else {
      vinculados.forEach(nomeEstudo => {
        const chip = estudosChips.createEl('div', {
          cls: 'snoopy-btn-mode snoopy-btn-sm',
          attr: { style: 'font-size: 11px; padding: 3px 8px; display: inline-flex; align-items: center; gap: 6px;' }
        });

        const linkBtn = chip.createEl('span', {
          attr: { style: 'cursor: pointer;' },
          text: `${nomeEstudo} ↗`
        });
        linkBtn.onclick = () => {
          if (app && app.workspace) {
            app.workspace.openLinkText(nomeEstudo, "", false);
          }
        };

        const btnUnlink = chip.createEl('button', {
          cls: 'snoopy-btn-action snoopy-btn-sm',
          attr: {
            style: 'padding: 0 4px; font-size: 9px; line-height: 1; border: none; background: transparent; cursor: pointer; color: #71717a;',
            title: `Desvincular ${nomeEstudo}`
          }
        });
        if (ctx.renderIcon) {
          ctx.renderIcon(btnUnlink, 'x', { size: 10 });
        } else {
          btnUnlink.textContent = 'x';
        }
        if (modais && modais.desvincularEstudo) {
          btnUnlink.onclick = async (e) => {
            if (e && e.stopPropagation) e.stopPropagation();
            await modais.desvincularEstudo(livroDestaque, nomeEstudo);
          };
        }
      });
    }

    // -------------------------------------------------------------------------
    // ABA 4: SINOPSE & FICHA TÉCNICA
    // -------------------------------------------------------------------------
    const panelSinopse = contentContainer.createEl('div', { attr: { id: 'panel-companion-sinopse' } });

    const sinopseTexto = livroDestaque.description || dadosMarkdown.sinopse || 'Sinopse não cadastrada. Clique em "Abrir Nota" para adicionar.';
    panelSinopse.innerHTML = `
      <div style="background: #12121a; border: 1px solid var(--snoopy-border); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px;">
        <span class="snoopy-section-title" style="font-size: 11.5px;">Sinopse da Obra</span>
        <div style="font-size: 12px; color: #a1a1aa; line-height: 1.5; max-height: 140px; overflow-y: auto;">
          ${sinopseTexto}
        </div>
        <div class="snoopy-meta" style="font-size: 10.5px; border-top: 1px solid var(--snoopy-border); padding-top: 8px; margin-top: 4px; color: #71717a;">
          ${livroDestaque.publish_date ? `Publicação: ${livroDestaque.publish_date} • ` : ''}
          ${livroDestaque.series ? `Série: ${livroDestaque.series} (Vol. ${livroDestaque.series_index || 1}) • ` : ''}
          Total: ${tot} páginas
        </div>
      </div>
    `;

    // Função que comuta as abas
    function atualizarExibicaoAbas() {
      panelProgresso.style.display = abaCompanionAtiva === 'progresso' ? 'block' : 'none';
      panelNotas.style.display = abaCompanionAtiva === 'notas' ? 'block' : 'none';
      panelEstudos.style.display = abaCompanionAtiva === 'estudos' ? 'block' : 'none';
      panelSinopse.style.display = abaCompanionAtiva === 'sinopse' ? 'block' : 'none';
    }

    atualizarExibicaoAbas();
  },

  /**
   * Renderiza o Hero Card legado para compatibilidade com outras views.
   */
  renderHeroCard(container, livroDestaque, ctx = {}) {
    return this.renderReaderCompanion(container, livroDestaque, ctx);
  },

  /**
   * Renderiza a visão alternativa completa do Dashboard inspirada no KOReader Bookshelf.
   * Contém Relógio Analógico SVG, telemetria de tempo e velocidade, Destaques & Citações,
   * Metas, Ofensiva, Séries agrupadas e Descoberta ("Experimente algo novo").
   *
   * @param {HTMLElement} container - Contêiner pai onde o dashboard será renderizado.
   * @param {object} dados - Dados consolidados obtidos via GamificacaoLeituras.gerarDadosDashboard.
   * @param {object} ctx - Contexto compartilhado.
   */
  renderDashboardKOReader(container, dados = {}, ctx = {}) {
    const relogio = dados.relogio || { diaSemana: 'Hoje', dataFormatada: '', hora: 12, minuto: 0 };
    const tempo = dados.tempoLeitura || { minutosHoje: 0, minutosSemana: 0, minutosTotal: 0, horasFormatadas: '0.0h', velocidadePagsHora: 40 };
    const metas = dados.metas || { diaria: { meta: 25, paginasHoje: 0, porcentagem: 0, batida: false }, semanal: { metaHoras: 5, horasLidas: 0, pct: 0 } };
    const ofensiva = dados.ofensiva || { streakAtual: 0, recordeStreak: 0, historico7Dias: [] };
    const desafios = dados.desafios || { desafioAnual: { meta: 12, concluidos: 0, pct: 0, projecaoFimAno: 0, statusRitmo: 'Em andamento' }, desafioDiversidade: { generosExplorados: [] } };
    const series = dados.series || [];
    const destaques = dados.destaquesCitacoes || [];
    const descoberta = dados.descoberta || null;
    const generosMaisLidos = dados.generosMaisLidos || [];
    const distribuicaoAcervo = dados.distribuicaoAcervo || { total: 0, lidos: 0, lendo: 0, queroLer: 0, pctLidos: 0, pctLendo: 0, pctQueroLer: 0, paginasCatalogo: 0, paginasLidas: 0 };
    const leituraAtiva = dados.leituraAtiva || null;
    const padraoSemanal = dados.padraoSemanal || { dias: [], diaPico: { diaSemana: 'Nenhum', paginas: 0, pct: 0 } };

    const dashContainer = container.createEl('div', {
      attr: { style: 'display: flex; flex-direction: column; gap: 16px;' }
    });

    // =========================================================================
    // 1. FAIXA EXECUTIVA DE PULSO (Storytelling: Ritmo de Leitura no Momento)
    // =========================================================================
    const kpisRow = dashContainer.createEl('div', {
      attr: {
        style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(135px, 1fr)); gap: 10px;'
      }
    });

    const kpisItens = [
      { label: 'Hoje', val: `${tempo.minutosHoje} min`, sub: `${metas.diaria.paginasHoje} páginas lidas` },
      { label: 'Esta Semana', val: `${metas.semanal.horasLidas}h`, sub: `Meta: ${metas.semanal.metaHoras}h (${metas.semanal.pct}%)` },
      { label: 'Ritmo Médio', val: `${tempo.velocidadePagsHora} págs/h`, sub: 'velocidade estimada' },
      { label: 'Ofensiva', val: `${ofensiva.streakAtual} dias`, sub: `recorde: ${ofensiva.recordeStreak} dias` },
      { label: 'Desafio Anual', val: `${desafios.desafioAnual.concluidos}/${desafios.desafioAnual.meta}`, sub: `${desafios.desafioAnual.pct}% concluído` }
    ];

    kpisItens.forEach(it => {
      const card = kpisRow.createEl('div', {
        cls: 'snoopy-card-box',
        attr: {
          style: 'padding: 12px 14px; display: flex; flex-direction: column; gap: 4px; background: #0d0d12; border: 1px solid var(--snoopy-border); border-radius: var(--snoopy-radius-md, 8px);'
        }
      });
      card.innerHTML = `
        <span class="snoopy-micro" style="color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.05em;">${it.label}</span>
        <span style="font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">${it.val}</span>
        <span class="snoopy-meta" style="font-size: 10.5px; color: #71717a;">${it.sub}</span>
      `;
    });

    // =========================================================================
    // 2. HERO DA LEITURA ATIVA (Foco Imediato e Próximo Passo)
    // =========================================================================
    if (leituraAtiva) {
      const bannerAtivo = dashContainer.createEl('div', {
        cls: 'snoopy-card-box',
        attr: {
          style: 'background: #0d0d12; border: 1px solid var(--snoopy-border); border-left: 3px solid #86efac; border-radius: var(--snoopy-radius-lg, 10px); padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap;'
        }
      });

      const esqInfo = bannerAtivo.createEl('div', {
        attr: { style: 'display: flex; align-items: center; gap: 16px; overflow: hidden; flex: 1; min-width: 260px;' }
      });

      const coverWrapper = esqInfo.createEl('div', {
        attr: { style: 'width: 58px; height: 87px; aspect-ratio: 2 / 3; border-radius: var(--snoopy-radius-sm, 6px); overflow: hidden; flex-shrink: 0; background: #161622; border: 1px solid rgba(255,255,255,0.12); position: relative;' }
      });

      const livroObj = leituraAtiva.livro || {};
      if (livroObj.cover && livroObj.cover.startsWith('http')) {
        const img = coverWrapper.createEl('img', {
          attr: {
            loading: 'lazy',
            decoding: 'async',
            style: 'width: 100%; height: 100%; object-fit: cover;'
          }
        });
        img.src = livroObj.cover;
        img.onerror = () => {
          img.style.display = 'none';
          coverWrapper.appendChild(BookshelfView.criarCapaTipografica(livroObj));
        };
      } else {
        coverWrapper.appendChild(BookshelfView.criarCapaTipografica(livroObj));
      }

      const detalhesBox = esqInfo.createEl('div', {
        attr: { style: 'display: flex; flex-direction: column; gap: 4px; overflow: hidden; flex: 1;' }
      });

      const faltamPags = Math.max(0, leituraAtiva.paginasTotais - leituraAtiva.paginasAtuais);

      detalhesBox.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="snoopy-micro" style="color: #86efac; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;">Leitura em Andamento</span>
          <span class="snoopy-chip snoopy-chip-muted" style="font-size: 10px; padding: 1px 6px;">
            ~${leituraAtiva.diasEstimados} dias estimados
          </span>
        </div>
        <span style="font-size: 16px; font-weight: 800; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.25;">${leituraAtiva.titulo}</span>
        <span class="snoopy-meta" style="font-size: 11.5px; color: #a1a1aa;">${leituraAtiva.autor}</span>
        
        <div style="margin-top: 6px; display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; justify-content: space-between; font-size: 11px;">
            <span style="font-weight: 700; color: #ffffff;">Página ${leituraAtiva.paginasAtuais} de ${leituraAtiva.paginasTotais} págs</span>
            <span class="snoopy-meta" style="color: #86efac; font-size: 10.5px; font-weight: 600;">${leituraAtiva.pct}% • faltam ${faltamPags} págs</span>
          </div>
          <div class="snoopy-prog-track" style="height: 5px; width: 100%; border-radius: 99px;">
            <div class="snoopy-prog-fill" style="width: ${leituraAtiva.pct}%; background: #86efac; border-radius: 99px;"></div>
          </div>
        </div>
      `;

      // Ações do Hero
      const heroActions = bannerAtivo.createEl('div', {
        attr: { style: 'display: flex; align-items: center; gap: 8px; flex-shrink: 0;' }
      });

      const btnFocarAtivo = heroActions.createEl('button', {
        cls: 'snoopy-btn-action snoopy-btn-sm',
        attr: { id: 'btn-dash-focar-ativo', style: 'font-size: 11.5px; padding: 6px 12px;' },
        text: 'Focar Leitura ↗'
      });

      if (btnFocarAtivo && leituraAtiva.livro && ctx.onSelectLivro) {
        btnFocarAtivo.onclick = () => ctx.onSelectLivro(leituraAtiva.livro.file ? leituraAtiva.livro.file.path : leituraAtiva.livro);
      }
    }

    // =========================================================================
    // 3. GRID ANALÍTICO PRINCIPAL (2 COLUNAS DE ALTO IMPACTO)
    // =========================================================================
    const mainGrid = dashContainer.createEl('div', {
      cls: 'snoopy-dash-main-grid',
      attr: {
        style: 'display: grid; grid-template-columns: 1.1fr 1fr; gap: 16px; align-items: start;'
      }
    });

    // -------------------------------------------------------------------------
    // COLUNA 1: CONSTÂNCIA TEMPORAL & VOLUME (Gráficos Semanais)
    // -------------------------------------------------------------------------
    const colEsq = mainGrid.createEl('div', {
      attr: { style: 'display: flex; flex-direction: column; gap: 16px;' }
    });

    // Card 1: Gráfico SVG de Barras de Páginas por Dia (Histórico 7 Dias)
    const cardGraficoSemanal = colEsq.createEl('div', {
      cls: 'snoopy-card-box',
      attr: {
        style: 'background: #0d0d12; border: 1px solid var(--snoopy-border); border-radius: var(--snoopy-radius-lg, 10px); padding: 18px; display: flex; flex-direction: column; gap: 14px;'
      }
    });

    const historico7D = ofensiva.historico7Dias || [];
    const maxPags7D = Math.max(metas.diaria.meta || 25, ...(historico7D.map(d => d.paginas || 0)));
    const alturaPlotH = 80;
    const larguraPlotW = 330;
    const paddingLeft = 24;
    const basePlotY = 95;
    const metaY = basePlotY - Math.round(((metas.diaria.meta || 25) / maxPags7D) * alturaPlotH);

    // Gerador de barras SVG dos 7 dias
    const barrasSvgHtml = historico7D.map((d, idx) => {
      const slotW = (larguraPlotW - paddingLeft) / 7;
      const xBar = paddingLeft + (idx * slotW) + (slotW / 2) - 12;
      const xCentro = xBar + 12;
      const pags = Number(d.paginas) || 0;
      const barH = pags > 0 ? Math.max(4, Math.round((pags / maxPags7D) * alturaPlotH)) : 3;
      const yBar = basePlotY - barH;
      const isBatida = pags >= (metas.diaria.meta || 25);
      const corBarra = isBatida ? '#86efac' : (pags > 0 ? '#60a5fa' : 'rgba(255,255,255,0.08)');

      return `
        <rect x="${xBar.toFixed(1)}" y="${yBar.toFixed(1)}" width="24" height="${barH.toFixed(1)}" rx="3" fill="${corBarra}" opacity="0.9" />
        ${pags > 0 ? `<text x="${xCentro.toFixed(1)}" y="${(yBar - 4).toFixed(1)}" text-anchor="middle" font-size="8.5" font-weight="700" fill="#ffffff" font-family="var(--snoopy-font-mono)">${pags}p</text>` : ''}
        <text x="${xCentro.toFixed(1)}" y="${basePlotY + 14}" text-anchor="middle" font-size="9" font-weight="600" fill="${d.leu ? '#ffffff' : '#71717a'}" font-family="var(--snoopy-font-mono)">${d.diaSemana}</text>
      `;
    }).join('');

    cardGraficoSemanal.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <span class="snoopy-section-title" style="font-size: 13.5px; letter-spacing: 0.04em;">CONSTÂNCIA & PÁGINAS (ÚLTIMOS 7 DIAS)</span>
        <span class="snoopy-meta" style="font-size: 11px; color: #86efac;">Total: ${tempo.horasFormatadas}</span>
      </div>

      <div style="width: 100%; position: relative;">
        <svg width="100%" height="120" viewBox="0 0 330 120" style="overflow: visible;">
          <!-- Linha de Base -->
          <line x1="${paddingLeft}" y1="${basePlotY}" x2="320" y2="${basePlotY}" stroke="rgba(255,255,255,0.1)" stroke-width="1" />
          
          <!-- Linha de Meta Diária -->
          <line x1="${paddingLeft}" y1="${metaY}" x2="280" y2="${metaY}" stroke="rgba(134,239,172,0.4)" stroke-dasharray="3,3" stroke-width="1.2" />
          <text x="320" y="${metaY + 3}" text-anchor="end" font-size="8.5" fill="#86efac" font-weight="700" font-family="var(--snoopy-font-mono)">Meta: ${metas.diaria.meta}p</text>

          <!-- Barras Semanais -->
          ${barrasSvgHtml}
        </svg>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--snoopy-border); padding-top: 8px; margin-top: 2px;">
        <span class="snoopy-meta" style="font-size: 11px; color: #a1a1aa;">${relogio.dataFormatada}</span>
        <div class="snoopy-toolbar" style="gap: 6px;">
          <button id="dash-btn-foco" class="snoopy-btn-action snoopy-btn-sm" style="font-size: 11px; padding: 2px 8px;" title="Direcionar Pomodoro da Home para leitura">Foco na Home</button>
          <button id="dash-btn-meta" class="snoopy-btn-action snoopy-btn-sm" style="font-size: 11px; padding: 2px 8px;" title="Alterar meta diária de páginas">Ajustar Meta</button>
        </div>
      </div>
    `;

    // Card 2: Padrão Semanal de Produtividade & Pico
    const cardProdutividade = colEsq.createEl('div', {
      cls: 'snoopy-card-box',
      attr: {
        style: 'background: #0d0d12; border: 1px solid var(--snoopy-border); border-radius: var(--snoopy-radius-lg, 10px); padding: 18px; display: flex; flex-direction: column; gap: 10px;'
      }
    });

    cardProdutividade.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <span class="snoopy-section-title" style="font-size: 13.5px; letter-spacing: 0.04em;">DIAS MAIS PRODUTIVOS</span>
        <span class="snoopy-meta" style="font-size: 11px; color: #86efac;">Pico: ${padraoSemanal.diaPico.diaSemana}</span>
      </div>

      <div style="font-size: 12.5px; color: #d4d4d8; line-height: 1.4;">
        Você lê mais aos <strong style="color: #ffffff;">${padraoSemanal.diaPico.diaSemana}s</strong> (${padraoSemanal.diaPico.paginas} págs, ${padraoSemanal.diaPico.pct}% do volume consolidado).
      </div>

      <!-- Barra de Ritmo da Semana -->
      <div style="display: flex; justify-content: space-between; font-size: 11px; color: #a1a1aa; margin-top: 4px;">
        <span>Meta Semanal: ${metas.semanal.horasLidas}h de ${metas.semanal.metaHoras}h</span>
        <span style="font-weight: 700; color: #60a5fa;">${metas.semanal.pct}%</span>
      </div>
      <div class="snoopy-prog-track" style="height: 5px; width: 100%; border-radius: 99px;">
        <div class="snoopy-prog-fill" style="width: ${metas.semanal.pct}%; background: #60a5fa; border-radius: 99px;"></div>
      </div>
    `;

    // -------------------------------------------------------------------------
    // COLUNA 2: DISTRIBUIÇÃO DO ACERVO, DONUT SVG & GÊNEROS
    // -------------------------------------------------------------------------
    const colDir = mainGrid.createEl('div', {
      attr: { style: 'display: flex; flex-direction: column; gap: 16px;' }
    });

    // Card 3: Donut SVG do Acervo (Lidos, Lendo, Quero Ler)
    const cardAcervo = colDir.createEl('div', {
      cls: 'snoopy-card-box',
      attr: {
        style: 'background: #0d0d12; border: 1px solid var(--snoopy-border); border-radius: var(--snoopy-radius-lg, 10px); padding: 18px; display: flex; flex-direction: column; gap: 14px;'
      }
    });

    // Matemática do Donut SVG
    const raioAcervo = 44;
    const circAcervo = 2 * Math.PI * raioAcervo; // ~276.46
    const totalAcervoLivros = Math.max(1, distribuicaoAcervo.total);
    let offsetDonutAcumulado = 0;
    let circlesDonutHtml = '';

    const dadosFatias = [
      { nome: 'Lidos', qtd: distribuicaoAcervo.lidos, pct: distribuicaoAcervo.pctLidos, cor: '#86efac' },
      { nome: 'Lendo', qtd: distribuicaoAcervo.lendo, pct: distribuicaoAcervo.pctLendo, cor: '#60a5fa' },
      { nome: 'Quero Ler', qtd: distribuicaoAcervo.queroLer, pct: distribuicaoAcervo.pctQueroLer, cor: '#fdba74' }
    ];

    if (distribuicaoAcervo.total === 0) {
      circlesDonutHtml = `<circle cx="55" cy="55" r="${raioAcervo}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="12" />`;
    } else {
      dadosFatias.forEach(f => {
        if (f.qtd <= 0) return;
        const proporcao = f.qtd / totalAcervoLivros;
        const strokeDash = proporcao * circAcervo;
        const strokeOffset = -offsetDonutAcumulado;
        offsetDonutAcumulado += strokeDash;

        circlesDonutHtml += `
          <circle cx="55" cy="55" r="${raioAcervo}" fill="none" stroke="${f.cor}" stroke-width="12"
            stroke-dasharray="${strokeDash.toFixed(2)} ${(circAcervo - strokeDash).toFixed(2)}"
            stroke-dashoffset="${strokeOffset.toFixed(2)}" style="transition: stroke-dasharray 0.3s ease;" />
        `;
      });
    }

    cardAcervo.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <span class="snoopy-section-title" style="font-size: 13.5px; letter-spacing: 0.04em;">DISTRIBUIÇÃO DO ACERVO</span>
        <span class="snoopy-meta" style="font-size: 11px;">${distribuicaoAcervo.total} livros • ${distribuicaoAcervo.paginasLidas}/${distribuicaoAcervo.paginasCatalogo} págs</span>
      </div>

      <div style="display: grid; grid-template-columns: 110px 1fr; gap: 16px; align-items: center;">
        <!-- Donut SVG -->
        <div style="position: relative; width: 110px; height: 110px; display: flex; align-items: center; justify-content: center;">
          <svg width="110" height="110" viewBox="0 0 110 110" style="transform: rotate(-90deg);">
            <circle cx="55" cy="55" r="${raioAcervo}" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="12" />
            ${circlesDonutHtml}
          </svg>
          <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; text-align: center;">
            <span style="font-size: 17px; font-weight: 800; color: #ffffff; line-height: 1;">${distribuicaoAcervo.total}</span>
            <span class="snoopy-micro" style="font-size: 8px; color: #a1a1aa; text-transform: uppercase;">LIVROS</span>
          </div>
        </div>

        <!-- Legenda com Indicadores Semânticos -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${dadosFatias.map(f => `
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11.5px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${f.cor}; flex-shrink: 0;"></span>
                <span style="color: #ffffff; font-weight: 600;">${f.nome}</span>
              </div>
              <span class="snoopy-meta" style="font-size: 11px;">${f.qtd} (${f.pct}%)</span>
            </div>
            <div class="snoopy-prog-track" style="height: 3px; width: 100%; border-radius: 99px;">
              <div class="snoopy-prog-fill" style="width: ${f.pct}%; background: ${f.cor}; border-radius: 99px;"></div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Barra Segmentada Tricolor (Mantida para Integridade e Testes) -->
      <div class="snoopy-seg-bar" style="display: flex; height: 4px; width: 100%; border-radius: 99px; overflow: hidden; background: rgba(255,255,255,0.05); margin-top: 4px;">
        <div style="height: 100%; width: ${distribuicaoAcervo.pctLidos}%; background: #86efac;"></div>
        <div style="height: 100%; width: ${distribuicaoAcervo.pctLendo}%; background: #60a5fa;"></div>
        <div style="height: 100%; width: ${distribuicaoAcervo.pctQueroLer}%; background: #fdba74;"></div>
      </div>
    `;

    // Card 4: Gêneros Mais Lidos (Storytelling: Equilíbrio Intelectual)
    const cardGeneros = colDir.createEl('div', {
      cls: 'snoopy-card-box',
      attr: {
        style: 'background: #0d0d12; border: 1px solid var(--snoopy-border); border-radius: var(--snoopy-radius-lg, 10px); padding: 18px; display: flex; flex-direction: column; gap: 12px;'
      }
    });

    const topGeneros = generosMaisLidos.slice(0, 4);
    const totalObrasGeneros = topGeneros.reduce((acc, g) => acc + g.quantidade, 0) || 1;

    cardGeneros.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <span class="snoopy-section-title" style="font-size: 13.5px; letter-spacing: 0.04em;">GÊNEROS MAIS LIDOS</span>
        <span class="snoopy-meta" style="font-size: 11px;">${generosMaisLidos.length} categorias</span>
      </div>

      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${topGeneros.length > 0 ? topGeneros.map(g => {
          const pctGen = Math.round((g.quantidade / totalObrasGeneros) * 100);
          return `
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px;">
                <span style="color: #ffffff; font-weight: 600;">${g.genero}</span>
                <span class="snoopy-meta" style="font-size: 11px;">${g.quantidade} livros (${pctGen}%)</span>
              </div>
              <div class="snoopy-prog-track" style="height: 4px; width: 100%; border-radius: 99px;">
                <div class="snoopy-prog-fill" style="width: ${pctGen}%; background: #60a5fa; border-radius: 99px;"></div>
              </div>
            </div>
          `;
        }).join('') : '<span class="snoopy-meta" style="font-size: 11.5px;">Nenhuma categoria registrada no acervo ainda.</span>'}
      </div>
    `;

    // =========================================================================
    // 4. BLOCOS CONDICIONAIS DE IMPACTO (Apenas se houver dados reais!)
    // =========================================================================

    // Destaque de Citação Marcante (se houver pelo menos 1 citação)
    if (destaques.length > 0) {
      const citacaoPrincipal = destaques[0];
      const cardCitacao = dashContainer.createEl('div', {
        cls: 'snoopy-card-box',
        attr: {
          style: 'background: #0d0d12; border: 1px solid var(--snoopy-border); border-left: 3px solid #60a5fa; border-radius: var(--snoopy-radius-lg, 10px); padding: 14px 18px;'
        }
      });
      cardCitacao.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span class="snoopy-section-title" style="font-size: 12px; letter-spacing: 0.04em;">DESTAQUE DA SEMANA</span>
          <span class="snoopy-meta" style="font-size: 10.5px;">${destaques.length} citações salvas</span>
        </div>
        <div style="font-size: 13.5px; font-style: italic; color: #e4e4e7; line-height: 1.45;">
          "${citacaoPrincipal.citacao}"
        </div>
        <div class="snoopy-meta" style="font-size: 11px; color: #a1a1aa; margin-top: 6px; text-align: right;">
          — ${citacaoPrincipal.autor}, em <strong style="color: #ffffff;">${citacaoPrincipal.livro}</strong>
        </div>
      `;
    }

    // Séries & Sagas (se houver pelo menos 1 série cadastrada)
    if (series.length > 0) {
      const cardSeries = dashContainer.createEl('div', {
        cls: 'snoopy-card-box',
        attr: {
          style: 'background: #0d0d12; border: 1px solid var(--snoopy-border); border-radius: var(--snoopy-radius-lg, 10px); padding: 16px 18px; display: flex; flex-direction: column; gap: 10px;'
        }
      });
      cardSeries.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <span class="snoopy-section-title" style="font-size: 13px; letter-spacing: 0.04em;">SÉRIES & SAGAS</span>
          <span class="snoopy-meta" style="font-size: 11px;">${series.length} coleções</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${series.slice(0, 3).map(s => `
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px;">
                <span style="font-weight: 700; color: #ffffff;">${s.nome}</span>
                <span class="snoopy-meta" style="font-size: 11px;">${s.livrosLidos}/${s.totalLivros} lidos (${s.progressoPct}%)</span>
              </div>
              <div class="snoopy-prog-track" style="height: 4px; width: 100%; border-radius: 99px;">
                <div class="snoopy-prog-fill" style="width: ${s.progressoPct}%; background: #60a5fa; border-radius: 99px;"></div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Próxima Leitura Sugerida (Descoberta Inteligente)
    if (descoberta && descoberta.livro) {
      const cardDesc = dashContainer.createEl('div', {
        cls: 'snoopy-card-box',
        attr: {
          style: 'background: #0d0d12; border: 1px solid var(--snoopy-border); border-radius: var(--snoopy-radius-lg, 10px); padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; gap: 14px;'
        }
      });
      cardDesc.innerHTML = `
        <div>
          <div class="snoopy-micro" style="color: #60a5fa; font-weight: 700;">EXPERIMENTE ALGO NOVO</div>
          <div style="font-size: 13.5px; font-weight: 700; color: #ffffff; margin-top: 2px;">${descoberta.livro.title || 'Livro'}</div>
          <div class="snoopy-meta" style="font-size: 11px; color: #a1a1aa;">${descoberta.motivo || 'Recomendado para expandir horizontes'}</div>
        </div>
        <button id="btn-abrir-descoberta" class="snoopy-btn-action snoopy-btn-sm" style="font-size: 11px; padding: 4px 10px; flex-shrink: 0;">Ver Livro ↗</button>
      `;

      const btnDesc = cardDesc.querySelector('#btn-abrir-descoberta');
      if (btnDesc && ctx.onSelectLivro) {
        btnDesc.onclick = () => ctx.onSelectLivro(descoberta.livro.file ? descoberta.livro.file.path : descoberta.livro);
      }
    }

    // Handlers dos botões do card de constância
    const btnFoco = cardGraficoSemanal.querySelector('#dash-btn-foco');
    if (btnFoco) {
      btnFoco.onclick = () => {
        const tarefaFoco = 'Sessão de Leitura';
        if (typeof window !== 'undefined') {
          if (!window.__snoopyPomodoroState) {
            window.__snoopyPomodoroState = {
              isRunning: false,
              endAt: null,
              remainingSeconds: 25 * 60,
              currentMode: 'foco',
              alvoAtual: tarefaFoco
            };
          } else {
            window.__snoopyPomodoroState.alvoAtual = tarefaFoco;
          }
        }
        if (ctx.events && typeof ctx.events.emit === 'function') {
          ctx.events.emit('pomodoro:focar', { tarefa: tarefaFoco });
        }
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('pomodoro:focar', { detail: { tarefa: tarefaFoco } }));
        }
        if (typeof Notice !== 'undefined') new Notice('[Snoopy] Alvo do Pomodoro definido como "Sessão de Leitura" na Home!');
      };
    }

    const btnMeta = cardGraficoSemanal.querySelector('#dash-btn-meta');
    if (btnMeta && ctx.modais && ctx.modais.abrirModalEditarMetaDiaria) {
      btnMeta.onclick = () => {
        ctx.modais.abrirModalEditarMetaDiaria(metas.diaria.meta, (nova) => {
          if (ctx.onDefinirMetaDiaria) ctx.onDefinirMetaDiaria(nova);
        });
      };
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BookshelfView;
}

return BookshelfView;

/**
 * Snoopy Vault - Subdashboard de Leituras: Gamificação, Metas e Recomendações
 * Módulo puro responsável pelo cálculo da ofensiva de leitura (streak),
 * acompanhamento da meta diária de páginas, consolidação dos desafios anuais
 * e cruzamento inteligente de matérias de estudo com o acervo.
 *
 * @module subdashboards/leituras/gamificacao
 */
class GamificacaoLeituras {
  /**
   * Dias da semana em formato reduzido para o heatmap.
   */
  static DIAS_SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

  /**
   * Converte objeto de data ou string para chave ISO YYYY-MM-DD.
   *
   * @param {string|Date} data - Valor da data.
   * @returns {string} String formatada YYYY-MM-DD.
   */
  static formatarISO(data) {
    if (!data) return '';
    if (typeof data === 'string') return data.slice(0, 10);
    if (data instanceof Date && !isNaN(data.getTime())) {
      const ano = data.getFullYear();
      const mes = String(data.getMonth() + 1).padStart(2, '0');
      const dia = String(data.getDate()).padStart(2, '0');
      return `${ano}-${mes}-${dia}`;
    }
    return '';
  }

  /**
   * Adiciona ou subtrai dias a partir de uma data no fuso local.
   *
   * @param {string} dataISO - Data base em formato YYYY-MM-DD.
   * @param {number} dias - Quantidade de dias a somar ou subtrair.
   * @returns {string} Nova data em formato YYYY-MM-DD.
   */
  static deslocarDias(dataISO, dias = 0) {
    const partes = dataISO.split('-').map(Number);
    const d = new Date(partes[0], partes[1] - 1, partes[2]);
    d.setDate(d.getDate() + dias);
    return this.formatarISO(d);
  }

  /**
   * Calcula a sequência ininterrupta de dias de leitura (streak) e o histórico dos últimos 7 dias.
   *
   * @param {Array<object>} notasDiarias - Lista de notas diárias do Dataview com 'date' e 'paginas_lidas'.
   * @param {string} dataHojeStr - Data de referência (YYYY-MM-DD).
   * @param {number} [metaDiaria=25] - Meta de páginas necessária para considerar o dia cumprido.
   * @returns {{ streakAtual: number, recordeStreak: number, historico7Dias: Array<{ data: string, diaSemana: string, leu: boolean, paginas: number }> }}
   */
  static calcularOfensiva(notasDiarias = [], dataHojeStr = '', metaDiaria = 25) {
    const hoje = dataHojeStr || this.formatarISO(new Date());

    // Mapeamento rápido de páginas lidas por data ISO
    const mapaLeituras = new Map();
    notasDiarias.forEach(n => {
      const dataStr = this.formatarISO(n.date || (n.file ? n.file.name : ''));
      if (dataStr) {
        const paginas = Number(n.paginas_lidas) || 0;
        mapaLeituras.set(dataStr, (mapaLeituras.get(dataStr) || 0) + paginas);
      }
    });

    // 1. Histórico dos últimos 7 dias (da data - 6 dias até hoje)
    const historico7Dias = [];
    for (let i = 6; i >= 0; i--) {
      const dataIso = this.deslocarDias(hoje, -i);
      const partes = dataIso.split('-').map(Number);
      const diaObj = new Date(partes[0], partes[1] - 1, partes[2]);
      const diaSemana = this.DIAS_SEMANA[diaObj.getDay()] || '';
      const paginas = mapaLeituras.get(dataIso) || 0;
      const leu = paginas >= metaDiaria;

      historico7Dias.push({
        data: dataIso,
        diaSemana,
        leu,
        paginas
      });
    }

    // 2. Cálculo da Ofensiva Atual (Streak)
    // Se hoje ainda não atingiu a meta, verificamos se ontem cumpriu para manter a chama viva
    const paginasHoje = mapaLeituras.get(hoje) || 0;
    const cumpriuHoje = paginasHoje >= metaDiaria;

    let streakAtual = 0;
    let dataCursor = cumpriuHoje ? hoje : this.deslocarDias(hoje, -1);

    while (true) {
      const pags = mapaLeituras.get(dataCursor) || 0;
      if (pags >= metaDiaria) {
        streakAtual++;
        dataCursor = this.deslocarDias(dataCursor, -1);
      } else {
        break;
      }
    }

    // 3. Cálculo aproximado do recorde histórico
    let recordeStreak = Math.max(streakAtual, 0);
    // Ordena todas as datas conhecidas para aferir sequências passadas
    const datasOrdenadas = Array.from(mapaLeituras.entries())
      .filter(([_, pags]) => pags >= metaDiaria)
      .map(([data]) => data)
      .sort();

    if (datasOrdenadas.length > 0) {
      let sequenciaCorrente = 0;
      let dataAnterior = null;

      for (const dStr of datasOrdenadas) {
        if (!dataAnterior) {
          sequenciaCorrente = 1;
        } else {
          const esperado = this.deslocarDias(dataAnterior, 1);
          if (dStr === esperado) {
            sequenciaCorrente++;
          } else {
            sequenciaCorrente = 1;
          }
        }
        dataAnterior = dStr;
        if (sequenciaCorrente > recordeStreak) {
          recordeStreak = sequenciaCorrente;
        }
      }
    }

    return {
      streakAtual,
      recordeStreak: Math.max(streakAtual, recordeStreak),
      historico7Dias
    };
  }

  /**
   * Calcula o histórico de leitura dos últimos 30 dias para alimentação do heatmap de calor e métricas.
   *
   * @param {Array<object>} notasDiarias - Lista de notas diárias do Dataview.
   * @param {string} dataHojeStr - Data de referência (YYYY-MM-DD).
   * @param {number} [metaDiaria=25] - Meta de páginas diárias para escala de níveis.
   * @returns {{ totalPaginas: number, weekPaginas: number, peakPaginas: number, streak: number, dias: Array<{ dataStr: string, valor: number, nivel: number }> }}
   */
  static calcularHistorico30Dias(notasDiarias = [], dataHojeStr = '', metaDiaria = 25) {
    const hoje = dataHojeStr || this.formatarISO(new Date());
    const meta = Math.max(1, Number(metaDiaria) || 25);

    // Mapeamento rápido de páginas lidas por data ISO
    const mapaLeituras = new Map();
    notasDiarias.forEach(n => {
      const dataStr = this.formatarISO(n.date || (n.file ? n.file.name : ''));
      if (dataStr) {
        const paginas = Number(n.paginas_lidas) || 0;
        mapaLeituras.set(dataStr, (mapaLeituras.get(dataStr) || 0) + paginas);
      }
    });

    const dias = [];
    for (let i = 29; i >= 0; i--) {
      const dataIso = this.deslocarDias(hoje, -i);
      const pags = mapaLeituras.get(dataIso) || 0;

      let nivel = 0;
      if (pags >= meta * 1.5) nivel = 4;
      else if (pags >= meta) nivel = 3;
      else if (pags >= Math.ceil(meta * 0.4)) nivel = 2;
      else if (pags > 0) nivel = 1;

      dias.push({
        dataStr: dataIso,
        valor: pags,
        nivel
      });
    }

    let totalPaginas = 0;
    let weekPaginas = 0;
    let peakPaginas = 0;

    dias.forEach((d, idx) => {
      totalPaginas += d.valor;
      if (idx >= 23) weekPaginas += d.valor; // Últimos 7 dias
      if (d.valor > peakPaginas) peakPaginas = d.valor;
    });

    // Sequência (streak)
    let streak = 0;
    let streakCounted = false;
    for (let i = dias.length - 1; i >= 0; i--) {
      const item = dias[i];
      if (!streakCounted) {
        if (item.valor >= meta) {
          streak++;
        } else if (item.dataStr === hoje && item.valor < meta) {
          // Hoje ainda em andamento: não interrompe imediatamente caso ainda não tenha lido
          continue;
        } else {
          streakCounted = true;
        }
      }
    }

    return {
      totalPaginas,
      weekPaginas,
      peakPaginas,
      streak,
      dias
    };
  }

  /**
   * Determina o estágio evolutivo e constância do leitor para o card de nível.
   *
   * @param {number} totalPaginas - Total acumulado de páginas lidas no histórico.
   * @param {number} streak - Dias consecutivos de leitura.
   * @returns {{ iconName: string, titulo: string, descricao: string, badge: string, pct: number }}
   */
  static calcularEstagioLeitor(totalPaginas = 0, streak = 0) {
    const pags = Number(totalPaginas) || 0;
    const s = Number(streak) || 0;

    if (pags >= 800 || s >= 21) {
      return {
        iconName: 'award',
        titulo: 'Polímata Literário',
        descricao: 'Leitura profunda, retenção aguçada e ecossistema de conhecimento consolidado.',
        badge: 'NÍVEL 4',
        pct: 100
      };
    }
    if (pags >= 300 || s >= 14) {
      return {
        iconName: 'book-open',
        titulo: 'Devorador de Livros',
        descricao: 'Ritmo consistente com grande volume de repertório acumulado.',
        badge: 'NÍVEL 3',
        pct: 75
      };
    }
    if (pags >= 100 || s >= 7) {
      return {
        iconName: 'sparkles',
        titulo: 'Leitor Dedicado',
        descricao: 'Constância diária firme e hábito incorporado à rotina.',
        badge: 'NÍVEL 2',
        pct: 50
      };
    }
    if (pags > 0 || s >= 1) {
      return {
        iconName: 'book',
        titulo: 'Aprendiz Ativo',
        descricao: 'Primeiros ciclos de leitura consolidados. Mantenha o fogo aceso.',
        badge: 'NÍVEL 1',
        pct: 25
      };
    }
    return {
      iconName: 'book',
      titulo: 'Início da Jornada',
      descricao: 'Abra um livro e inicie sua ofensiva de leitura.',
      badge: 'NÍVEL 1',
      pct: 0
    };
  }

  /**
   * Calcula o progresso do dia atual em relação à meta diária e projeta dias para conclusão do livro em foco.
   *
   * @param {number} paginasHoje - Páginas registradas na nota de hoje.
   * @param {number} [metaDiaria=25] - Meta de páginas diárias.
   * @param {number} [paginasRestantesLivro=0] - Páginas que faltam no livro selecionado.
   * @returns {{ meta: number, paginasHoje: number, porcentagem: number, batida: boolean, diasParaTermino: number }}
   */
  static calcularProgressoMeta(paginasHoje = 0, metaDiaria = 25, paginasRestantesLivro = 0) {
    const meta = Math.max(1, Number(metaDiaria) || 25);
    const pagHoje = Math.max(0, Number(paginasHoje) || 0);
    const porcentagem = Math.min(100, Math.round((pagHoje / meta) * 100));
    const batida = pagHoje >= meta;

    const rest = Math.max(0, Number(paginasRestantesLivro) || 0);
    const diasParaTermino = rest > 0 ? Math.ceil(rest / meta) : 0;

    return {
      meta,
      paginasHoje: pagHoje,
      porcentagem,
      batida,
      diasParaTermino
    };
  }

  /**
   * Analisa a distribuição de leitura pelos dias da semana a partir das notas diárias.
   *
   * @param {Array<object>} notasDiarias - Lista de notas diárias do diário.
   * @returns {{ dias: Array<{ diaSemana: string, diaCurto: string, paginas: number, pct: number }>, diaPico: { diaSemana: string, paginas: number, pct: number } }}
   */
  static calcularPadraoSemanal(notasDiarias = []) {
    const nomesCompletos = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const nomesCurtos = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
    const mapaPagsPorDia = [0, 0, 0, 0, 0, 0, 0];

    notasDiarias.forEach(n => {
      const dataIso = this.formatarISO(n.date || (n.file ? n.file.name : ''));
      if (dataIso) {
        const pags = Number(n.paginas_lidas) || 0;
        const partes = dataIso.split('-').map(Number);
        if (partes.length === 3) {
          const dt = new Date(partes[0], partes[1] - 1, partes[2]);
          const diaSemanaIdx = dt.getDay();
          if (diaSemanaIdx >= 0 && diaSemanaIdx <= 6) {
            mapaPagsPorDia[diaSemanaIdx] += pags;
          }
        }
      }
    });

    const totalPags = mapaPagsPorDia.reduce((acc, v) => acc + v, 0);
    let picoIdx = 0;
    let picoPags = 0;

    mapaPagsPorDia.forEach((pags, idx) => {
      if (pags > picoPags) {
        picoPags = pags;
        picoIdx = idx;
      }
    });

    const dias = mapaPagsPorDia.map((pags, idx) => ({
      diaSemana: nomesCompletos[idx],
      diaCurto: nomesCurtos[idx],
      paginas: pags,
      pct: totalPags > 0 ? Math.round((pags / totalPags) * 100) : 0
    }));

    const diaPico = {
      diaSemana: nomesCompletos[picoIdx],
      paginas: picoPags,
      pct: totalPags > 0 ? Math.round((picoPags / totalPags) * 100) : 0
    };

    return { dias, diaPico };
  }

  /**
   * Consolida os desafios de leitura do ano corrente de forma acionável e integrada ao acervo.
   *
   * @param {Array<object>} livros - Lista de todos os livros do acervo.
   * @param {number} [anoReferencia=2026] - Ano do desafio.
   * @param {number} [metaLivrosAno=12] - Meta anual de livros lidos.
   * @param {string} [dataHojeStr=''] - Data atual no formato ISO YYYY-MM-DD.
   * @returns {{ desafioAnual: { meta: number, concluidos: number, pct: number, projecaoFimAno: number, statusRitmo: string }, desafioDiversidade: { generosExplorados: string[], generosFaltantes: string[], concluiuMeta: boolean, proximaAcao: object }, desafioTijolo: { totalDensos: number, lidosDensos: number, proximoTijolo: object|null } }}
   */
  static calcularDesafios(livros = [], anoReferencia = 2026, metaLivrosAno = 12, dataHojeStr = '') {
    const anoStr = String(anoReferencia || new Date().getFullYear());
    const metaAnual = Math.max(1, Number(metaLivrosAno) || 12);

    let concluidosAno = 0;
    const generosExploradosSet = new Set();
    let totalDensos = 0;
    let lidosDensos = 0;

    livros.forEach(l => {
      const isLido = String(l.status || '').toLowerCase().includes('lido');
      const finStr = String(l.finished || '');
      const paginas = Number(l.total_pages) || 0;

      if (paginas >= 350) {
        totalDensos++;
        if (isLido) lidosDensos++;
      }

      if (isLido && finStr.startsWith(anoStr)) {
        concluidosAno++;
        const cat = l.category || 'Geral';
        if (cat && cat !== 'Geral') {
          generosExploradosSet.add(cat);
        }
      }
    });

    const generosExplorados = Array.from(generosExploradosSet);
    const generosMetaPadrao = ['Tecnologia', 'Filosofia', 'Romance', 'Negócios', 'Desenvolvimento Pessoal', 'História'];
    const generosFaltantes = generosMetaPadrao.filter(g => !generosExploradosSet.has(g));
    const concluiuDiversidade = generosExplorados.length >= 4;

    const pctAnual = Math.min(100, Math.round((concluidosAno / metaAnual) * 100));

    // Projeção de Ritmo Anual
    const mesAtual = dataHojeStr ? (Number(dataHojeStr.split('-')[1]) || (new Date().getMonth() + 1)) : (new Date().getMonth() + 1);
    const mediaMes = concluidosAno / Math.max(1, mesAtual);
    const projecaoFimAno = Math.round(mediaMes * 12);
    let statusRitmo = 'No ritmo';
    if (concluidosAno >= metaAnual) {
      statusRitmo = 'Meta superada';
    } else if (projecaoFimAno < metaAnual) {
      statusRitmo = 'Abaixo do ritmo';
    }

    // Ação Prática de Diversidade: sugerir livro do acervo para o próximo gênero faltante
    const proximoGenero = generosFaltantes.length > 0 ? generosFaltantes[0] : (generosMetaPadrao[0] || 'Geral');
    const livroSugeridoAcervo = livros.find(l => {
      const cat = l.category || '';
      const cats = Array.isArray(l.categories) ? l.categories : [cat];
      const status = String(l.status || '').toLowerCase();
      return !status.includes('lido') && (cats.some(c => c.toLowerCase() === proximoGenero.toLowerCase()) || cat.toLowerCase().includes(proximoGenero.toLowerCase()));
    }) || null;

    const proximaAcao = {
      genero: proximoGenero,
      livroSugeridoAcervo
    };

    // Próxima Obra Densa não lida
    const proximoTijolo = livros.find(l => {
      const paginas = Number(l.total_pages) || 0;
      const status = String(l.status || '').toLowerCase();
      return paginas >= 350 && !status.includes('lido');
    }) || null;

    return {
      desafioAnual: {
        meta: metaAnual,
        concluidos: concluidosAno,
        pct: pctAnual,
        projecaoFimAno,
        statusRitmo
      },
      desafioDiversidade: {
        generosExplorados,
        generosFaltantes,
        concluiuMeta: concluiuDiversidade,
        proximaAcao
      },
      desafioTijolo: {
        totalDensos,
        lidosDensos,
        proximoTijolo
      }
    };
  }

  /**
   * Cruza matérias ativas de estudo com o acervo e identifica disciplinas sem livros associados.
   *
   * @param {Array<object>} materias - Lista de notas de 03_Estudos/ ativas.
   * @param {Array<object>} livros - Lista de livros do acervo.
   * @returns {{ recomendacoesAcervo: Array<{ materia: string, area: string, livro: object }>, materiasSemLivro: Array<{ materia: string, area: string }> }}
   */
  static cruzarRecomendacoesEstudos(materias = [], livros = []) {
    const recomendacoesAcervo = [];
    const materiasSemLivro = [];

    const materiasAtivas = materias.filter(m => {
      const st = String(m.status || '').toLowerCase();
      return st === '' || st.includes('ativo') || st.includes('em andamento');
    });

    materiasAtivas.forEach(mat => {
      const matNome = mat.title || (mat.file ? mat.file.name : 'Estudo');
      const matArea = (mat.area || mat.categoria || '').trim().toLowerCase();

      // Livros já vinculados diretamente a esta matéria
      const livrosVinculados = livros.filter(l => {
        const est = Array.isArray(l.estudos_vinculados) ? l.estudos_vinculados : [];
        return est.some(e => String(e).includes(matNome));
      });

      // Procura livros na estante com status 'Quero ler' da mesma área/categoria
      const candidatosAcervo = livros.filter(l => {
        const statusLivro = String(l.status || '').toLowerCase();
        if (!statusLivro.includes('quero')) return false;

        const catLivro = String(l.category || '').toLowerCase();
        if (!catLivro || catLivro === 'geral') return false;

        return matArea && (catLivro.includes(matArea) || matArea.includes(catLivro));
      });

      if (livrosVinculados.length === 0 && candidatosAcervo.length === 0) {
        materiasSemLivro.push({
          materia: matNome,
          area: mat.area || mat.categoria || 'Geral'
        });
      }

      candidatosAcervo.forEach(livroCand => {
        // Evita duplicar o mesmo livro para a mesma matéria
        if (!recomendacoesAcervo.some(r => r.livro.title === livroCand.title && r.materia === matNome)) {
          recomendacoesAcervo.push({
            materia: matNome,
            area: mat.area || mat.categoria || 'Geral',
            livro: livroCand
          });
        }
      });
    });

    return {
      recomendacoesAcervo,
      materiasSemLivro
    };
  }

  /**
   * Consolida métricas completas para a visualização do Dashboard estilo KOReader Bookshelf:
   * relógio analógico/digital, tempo de leitura (hoje, semana, total, velocidade págs/h), metas,
   * ofensiva com heatmap, desafios anuais, agrupamento de séries, citações em destaque e descoberta.
   *
   * @param {Array<object>} livros - Acervo completo de livros.
   * @param {Array<object>} notasDiarias - Notas diárias com paginas_lidas e minutos_leitura.
   * @param {Array<object>} materias - Matérias da pasta 03_Estudos.
   * @param {object} [config={}] - Configurações opcionais (dataHoje, metaDiaria, metaSemanalHoras).
   * @returns {object} Objeto consolidado para renderização do dashboard.
   */
  static gerarDadosDashboard(livros = [], notasDiarias = [], materias = [], config = {}) {
    const hojeStr = config.dataHoje || this.formatarISO(new Date());
    const metaDiaria = Number(config.metaDiaria) || 25;
    const metaSemanalHoras = Number(config.metaSemanalHoras) || 5;

    // 1. Relógio & Data
    const agora = new Date();
    const partesHoje = hojeStr.split('-').map(Number);
    const dataRef = new Date(partesHoje[0], partesHoje[1] - 1, partesHoje[2]);
    const diaSemanaNome = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][dataRef.getDay()];
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const dataExtenso = `${diaSemanaNome}, ${partesHoje[2]} de ${meses[partesHoje[1] - 1]}`;

    // 2. Tempo de Leitura e Páginas nas Notas Diárias
    const mapaDias = new Map();
    let minutosTotal = 0;
    let paginasTotal = 0;

    notasDiarias.forEach(n => {
      const d = this.formatarISO(n.date || (n.file ? n.file.name : ''));
      if (d) {
        const mins = Number(n.minutos_leitura) || 0;
        const pags = Number(n.paginas_lidas) || 0;
        mapaDias.set(d, { minutos: mins, paginas: pags });
        minutosTotal += mins;
        paginasTotal += pags;
      }
    });

    const dadosHoje = mapaDias.get(hojeStr) || { minutos: 0, paginas: 0 };
    const minutosHoje = dadosHoje.minutos;
    const paginasHoje = dadosHoje.paginas;

    // Soma dos últimos 7 dias
    let minutosSemana = 0;
    let paginasSemana = 0;
    for (let i = 0; i < 7; i++) {
      const dIso = this.deslocarDias(hojeStr, -i);
      const reg = mapaDias.get(dIso);
      if (reg) {
        minutosSemana += reg.minutos;
        paginasSemana += reg.paginas;
      }
    }

    // Minutos focados também nos livros via Pomodoro
    let minutosFocoLivros = 0;
    livros.forEach(l => {
      minutosFocoLivros += Number(l.minutos_foco) || 0;
    });
    if (minutosTotal === 0 && minutosFocoLivros > 0) {
      minutosTotal = minutosFocoLivros;
    }

    // Velocidade de leitura estimada (páginas por hora)
    const minutosParaCalcVel = minutosTotal > 0 ? minutosTotal : minutosFocoLivros;
    let velocidadePagsHora = 40;
    if (minutosParaCalcVel >= 15 && paginasTotal > 0) {
      velocidadePagsHora = Math.round((paginasTotal / (minutosParaCalcVel / 60)));
    } else if (minutosHoje >= 10 && paginasHoje > 0) {
      velocidadePagsHora = Math.round((paginasHoje / (minutosHoje / 60)));
    }

    // 3. Ofensiva e Metas
    const ofensiva = this.calcularOfensiva(notasDiarias, hojeStr, metaDiaria);
    const metaProgresso = this.calcularProgressoMeta(paginasHoje, metaDiaria);

    const metaSemanalMins = metaSemanalHoras * 60;
    const progressoSemanalPct = Math.min(100, Math.round((minutosSemana / metaSemanalMins) * 100));

    // 4. Agrupamento de Séries
    const mapaSeries = new Map();
    livros.forEach(l => {
      const serieNome = (l.series || '').trim();
      if (serieNome) {
        if (!mapaSeries.has(serieNome)) {
          mapaSeries.set(serieNome, []);
        }
        mapaSeries.get(serieNome).push(l);
      }
    });

    const series = [];
    mapaSeries.forEach((livrosDaSerie, nome) => {
      livrosDaSerie.sort((a, b) => (Number(a.series_index) || 1) - (Number(b.series_index) || 1));
      const totalLivros = livrosDaSerie.length;
      const livrosLidos = livrosDaSerie.filter(l => String(l.status || '').toLowerCase().includes('lido')).length;
      const progressoPct = Math.round((livrosLidos / totalLivros) * 100);

      series.push({
        nome,
        totalLivros,
        livrosLidos,
        progressoPct,
        livros: livrosDaSerie
      });
    });
    series.sort((a, b) => b.progressoPct - a.progressoPct);

    // 5. Gêneros mais lidos
    const contagemGeneros = {};
    livros.forEach(l => {
      const cats = Array.isArray(l.categories) && l.categories.length > 0 
        ? l.categories 
        : [l.category || 'Geral'];
      cats.forEach(c => {
        const limpo = typeof c === 'string' ? c.trim() : '';
        if (limpo && limpo !== 'Geral') {
          contagemGeneros[limpo] = (contagemGeneros[limpo] || 0) + 1;
        }
      });
    });
    const generosMaisLidos = Object.entries(contagemGeneros)
      .map(([genero, quantidade]) => ({ genero, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade);

    // 6. Citações e Destaques
    const destaquesCitacoes = [];
    livros.forEach(l => {
      const arr = Array.isArray(l.licoes) ? l.licoes : [];
      arr.forEach(cit => {
        if (cit && typeof cit === 'string' && cit.trim().length > 5) {
          destaquesCitacoes.push({
            livro: l.title || (l.file ? l.file.name : 'Livro'),
            autor: l.author || 'Autor',
            citacao: cit.trim().replace(/^"+|"+$/g, '')
          });
        }
      });
    });

    // 7. Descoberta ("Experimente algo novo")
    const cruzamento = this.cruzarRecomendacoesEstudos(materias, livros);
    let descoberta = null;
    if (cruzamento.recomendacoesAcervo.length > 0) {
      const rec = cruzamento.recomendacoesAcervo[0];
      descoberta = {
        livro: rec.livro,
        motivo: `Relacionado à disciplina "${rec.materia}"`
      };
    } else {
      const queroLer = livros.find(l => String(l.status || '').toLowerCase().includes('quero'));
      if (queroLer) {
        descoberta = {
          livro: queroLer,
          motivo: 'Aguardando início na sua lista de desejos'
        };
      }
    }

    // 8. Distribuição do Acervo & Livro em Leitura Ativa
    const totalLivros = livros.length;
    let lidosCount = 0;
    let lendoCount = 0;
    let queroLerCount = 0;
    let totalPagsCatalogo = 0;
    let totalPagsLidas = 0;
    let livroEmLeitura = null;

    livros.forEach(l => {
      const st = String(l.status || '').toLowerCase();
      const cur = Number(l.current_page) || 0;
      const tot = Number(l.total_pages) || 0;
      totalPagsCatalogo += tot;

      if (st.includes('lido') || (tot > 0 && cur >= tot)) {
        lidosCount++;
        totalPagsLidas += (tot > 0 ? tot : cur);
      } else if (st.includes('lendo') || cur > 0) {
        lendoCount++;
        totalPagsLidas += cur;
        if (!livroEmLeitura) livroEmLeitura = l;
      } else {
        queroLerCount++;
      }
    });

    const distribuicaoAcervo = {
      total: totalLivros,
      lidos: lidosCount,
      lendo: lendoCount,
      queroLer: queroLerCount,
      pctLidos: totalLivros > 0 ? Math.round((lidosCount / totalLivros) * 100) : 0,
      pctLendo: totalLivros > 0 ? Math.round((lendoCount / totalLivros) * 100) : 0,
      pctQueroLer: totalLivros > 0 ? Math.round((queroLerCount / totalLivros) * 100) : 0,
      paginasCatalogo: totalPagsCatalogo,
      paginasLidas: totalPagsLidas
    };

    let leituraAtiva = null;
    if (livroEmLeitura) {
      const cur = Number(livroEmLeitura.current_page) || 0;
      const tot = Number(livroEmLeitura.total_pages) || 100;
      const pct = tot > 0 ? Math.round((cur / tot) * 100) : 0;
      const pagsRestantes = Math.max(0, tot - cur);
      const diasEstimados = Math.ceil(pagsRestantes / Math.max(1, metaDiaria));
      leituraAtiva = {
        titulo: livroEmLeitura.title || (livroEmLeitura.file ? livroEmLeitura.file.name : 'Livro'),
        autor: livroEmLeitura.author || 'Autor',
        paginasAtuais: cur,
        paginasTotais: tot,
        pct,
        diasEstimados,
        livro: livroEmLeitura
      };
    }

    // 9. Padrão Semanal de Leitura (Dias mais produtivos)
    const padraoSemanal = this.calcularPadraoSemanal(notasDiarias);

    // 10. Desafios Anuais com Projeção e Ações
    const desafios = this.calcularDesafios(livros, partesHoje[0], 12, hojeStr);

    return {
      relogio: {
        diaSemana: diaSemanaNome,
        dataFormatada: dataExtenso,
        hora: agora.getHours(),
        minuto: agora.getMinutes()
      },
      tempoLeitura: {
        minutosHoje,
        minutosSemana,
        minutosTotal,
        horasFormatadas: (minutosTotal / 60).toFixed(1) + 'h',
        velocidadePagsHora
      },
      metas: {
        diaria: metaProgresso,
        semanal: {
          metaHoras: metaSemanalHoras,
          horasLidas: Number((minutosSemana / 60).toFixed(1)),
          pct: progressoSemanalPct
        }
      },
      ofensiva,
      desafios,
      series,
      generosMaisLidos,
      padraoSemanal,
      distribuicaoAcervo,
      leituraAtiva,
      destaquesCitacoes,
      descoberta
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GamificacaoLeituras;
}

return GamificacaoLeituras;

const { test, describe } = require('node:test');
const assert = require('node:assert');
const GamificacaoLeituras = require('../../../99_Meta/Snoopy/subdashboards/leituras/gamificacao.js');

describe('Subdashboard Leituras - GamificacaoLeituras', () => {
  test('Calcula ofensiva de leitura (streak) e histórico de 7 dias', () => {
    const notasDiarias = [
      { date: '2026-10-10', paginas_lidas: 30 },
      { date: '2026-10-09', paginas_lidas: 25 },
      { date: '2026-10-08', paginas_lidas: 10 },
      { date: '2026-10-07', paginas_lidas: 0 },
      { date: '2026-10-06', paginas_lidas: 40 }
    ];

    const resultado = GamificacaoLeituras.calcularOfensiva(notasDiarias, '2026-10-10', 25);
    assert.strictEqual(resultado.streakAtual, 2); // 10 e 09 atingiram meta >= 25
    assert.strictEqual(resultado.historico7Dias.length, 7);
    assert.strictEqual(resultado.historico7Dias[6].data, '2026-10-10');
    assert.strictEqual(resultado.historico7Dias[6].leu, true);
    assert.strictEqual(resultado.historico7Dias[6].paginas, 30);
  });

  test('Mantém ofensiva ativa caso hoje ainda não tenha lido mas ontem leu', () => {
    const notasDiarias = [
      { date: '2026-10-10', paginas_lidas: 0 },
      { date: '2026-10-09', paginas_lidas: 25 },
      { date: '2026-10-08', paginas_lidas: 30 }
    ];

    const resultado = GamificacaoLeituras.calcularOfensiva(notasDiarias, '2026-10-10', 25);
    assert.strictEqual(resultado.streakAtual, 2); // Mantém vivo baseado em ontem
  });

  test('Calcula meta diária (padrão 25 págs) e estimativa de conclusão do livro', () => {
    const prog = GamificacaoLeituras.calcularProgressoMeta(15, 25, 100);
    assert.strictEqual(prog.meta, 25);
    assert.strictEqual(prog.paginasHoje, 15);
    assert.strictEqual(prog.porcentagem, 60);
    assert.strictEqual(prog.batida, false);
    assert.strictEqual(prog.diasParaTermino, 4); // 100 págs / 25 págs/dia = 4 dias

    const batida = GamificacaoLeituras.calcularProgressoMeta(30, 25, 20);
    assert.strictEqual(batida.porcentagem, 100);
    assert.strictEqual(batida.batida, true);
    assert.strictEqual(batida.diasParaTermino, 1);
  });

  test('Calcula desafios de leitura de volume anual e diversidade de temas', () => {
    const livros = [
      { status: 'Lido', finished: '2026-03-15', category: 'Tecnologia', total_pages: 420 },
      { status: 'Lido', finished: '2026-05-20', category: 'Filosofia', total_pages: 200 },
      { status: 'Lendo', category: 'Romance', total_pages: 310 }
    ];

    const desafios = GamificacaoLeituras.calcularDesafios(livros, 2026, 12, '2026-10-10');
    assert.strictEqual(desafios.desafioAnual.concluidos, 2);
    assert.strictEqual(desafios.desafioAnual.meta, 12);
    assert.strictEqual(desafios.desafioAnual.pct, 17);
    assert.ok(desafios.desafioAnual.projecaoFimAno >= 0);
    assert.ok(desafios.desafioDiversidade.generosExplorados.includes('Tecnologia'));
    assert.ok(desafios.desafioDiversidade.generosExplorados.includes('Filosofia'));
    assert.ok(desafios.desafioDiversidade.proximaAcao);
    assert.strictEqual(desafios.desafioTijolo.lidosDensos, 1);
  });

  test('Cruza matérias ativas de estudo com recomendações do acervo e nuvem', () => {
    const materias = [
      { title: 'Arquitetura de Software', area: 'Programação', status: 'Ativo' },
      { title: 'Neurociência Cognitiva', area: 'Psicologia', status: 'Ativo' }
    ];
    const livros = [
      { title: 'Clean Architecture', category: 'Programação', status: 'Quero ler' },
      { title: 'Ficção Aleatória', category: 'Romance', status: 'Quero ler' }
    ];

    const cruzamento = GamificacaoLeituras.cruzarRecomendacoesEstudos(materias, livros);
    assert.strictEqual(cruzamento.recomendacoesAcervo.length, 1);
    assert.strictEqual(cruzamento.recomendacoesAcervo[0].livro.title, 'Clean Architecture');
    assert.strictEqual(cruzamento.recomendacoesAcervo[0].materia, 'Arquitetura de Software');
    assert.strictEqual(cruzamento.materiasSemLivro.length, 1);
    assert.strictEqual(cruzamento.materiasSemLivro[0].materia, 'Neurociência Cognitiva');
  });

  test('Gera consolidação completa de dados para o Dashboard KOReader Bookshelf', () => {
    const livros = [
      {
        title: 'Duna',
        author: 'Frank Herbert',
        category: 'Ficção Científica',
        categories: ['Ficção Científica', 'Filosofia'],
        status: 'Lido',
        finished: '2026-02-10',
        total_pages: 500,
        current_page: 500,
        series: 'Crônicas de Duna',
        series_index: 1,
        minutos_foco: 600,
        licoes: ['O medo é o assassino da mente.']
      },
      {
        title: 'Messias de Duna',
        author: 'Frank Herbert',
        category: 'Ficção Científica',
        status: 'Lendo',
        total_pages: 300,
        current_page: 150,
        series: 'Crônicas de Duna',
        series_index: 2,
        minutos_foco: 180
      },
      {
        title: 'O Hobbit',
        author: 'J.R.R. Tolkien',
        category: 'Fantasia',
        status: 'Quero ler',
        total_pages: 310,
        current_page: 0
      }
    ];

    const notasDiarias = [
      { date: '2026-10-10', paginas_lidas: 30, minutos_leitura: 45 },
      { date: '2026-10-09', paginas_lidas: 25, minutos_leitura: 40 },
      { date: '2026-10-08', paginas_lidas: 20, minutos_leitura: 30 }
    ];

    const materias = [
      { title: 'Literatura Fantástica', area: 'Fantasia', status: 'Ativo' }
    ];

    const dash = GamificacaoLeituras.gerarDadosDashboard(livros, notasDiarias, materias, {
      dataHoje: '2026-10-10',
      metaDiaria: 25,
      metaSemanalHoras: 5
    });

    // 1. Tempo e velocidade
    assert.ok(dash.tempoLeitura);
    assert.strictEqual(dash.tempoLeitura.minutosHoje, 45);
    assert.strictEqual(dash.tempoLeitura.minutosSemana, 115);
    assert.ok(dash.tempoLeitura.velocidadePagsHora > 0);

    // 2. Séries
    assert.ok(dash.series);
    assert.strictEqual(dash.series.length, 1);
    assert.strictEqual(dash.series[0].nome, 'Crônicas de Duna');
    assert.strictEqual(dash.series[0].totalLivros, 2);
    assert.strictEqual(dash.series[0].livrosLidos, 1);
    assert.strictEqual(dash.series[0].progressoPct, 50);

    // 3. Descoberta
    assert.ok(dash.descoberta);
    assert.strictEqual(dash.descoberta.livro.title, 'O Hobbit');

    // 4. Citação em destaque
    assert.ok(dash.destaquesCitacoes.length >= 1);
    assert.strictEqual(dash.destaquesCitacoes[0].citacao, 'O medo é o assassino da mente.');

    // 5. Gêneros mais lidos
    assert.ok(dash.generosMaisLidos.length >= 1);
    assert.strictEqual(dash.generosMaisLidos[0].genero, 'Ficção Científica');

    // 6. Distribuição do Acervo
    assert.ok(dash.distribuicaoAcervo);
    assert.strictEqual(dash.distribuicaoAcervo.total, 3);
    assert.strictEqual(dash.distribuicaoAcervo.lidos, 1);
    assert.strictEqual(dash.distribuicaoAcervo.lendo, 1);
    assert.strictEqual(dash.distribuicaoAcervo.queroLer, 1);
    assert.strictEqual(dash.distribuicaoAcervo.pctLidos, 33);
    assert.strictEqual(dash.distribuicaoAcervo.paginasCatalogo, 1110);

    // 7. Leitura Ativa com Projeção
    assert.ok(dash.leituraAtiva);
    assert.strictEqual(dash.leituraAtiva.titulo, 'Messias de Duna');
    assert.strictEqual(dash.leituraAtiva.paginasAtuais, 150);
    assert.strictEqual(dash.leituraAtiva.pct, 50);
    assert.strictEqual(dash.leituraAtiva.diasEstimados, 6); // 150 págs restantes / 25 págs por dia = 6 dias

    // 8. Padrão Semanal
    assert.ok(dash.padraoSemanal);
    assert.strictEqual(dash.padraoSemanal.dias.length, 7);
  });

  test('calcularPadraoSemanal identifica dias de maior volume de leitura e dia pico', () => {
    const notasDiarias = [
      { date: '2026-10-10', paginas_lidas: 60 }, // Sábado
      { date: '2026-10-09', paginas_lidas: 20 }, // Sexta
      { date: '2026-10-08', paginas_lidas: 20 }  // Quinta
    ];

    const padrao = GamificacaoLeituras.calcularPadraoSemanal(notasDiarias);
    assert.strictEqual(padrao.dias.length, 7);
    assert.strictEqual(padrao.diaPico.diaSemana, 'Sábado');
    assert.strictEqual(padrao.diaPico.paginas, 60);
    assert.strictEqual(padrao.diaPico.pct, 60); // 60 págs de 100 = 60%
  });

  test('calcularHistorico30Dias() gera janela de 30 dias com níveis de calor e métricas unificadas', () => {
    const notasDiarias = [
      { date: '2026-10-10', paginas_lidas: 30 },
      { date: '2026-10-09', paginas_lidas: 25 },
      { date: '2026-10-08', paginas_lidas: 50 },
      { date: '2026-10-01', paginas_lidas: 15 }
    ];

    const res = GamificacaoLeituras.calcularHistorico30Dias(notasDiarias, '2026-10-10', 25);
    assert.strictEqual(res.dias.length, 30);
    assert.strictEqual(res.totalPaginas, 120);
    assert.strictEqual(res.peakPaginas, 50);
    assert.strictEqual(res.streak, 3);
    assert.strictEqual(res.dias[res.dias.length - 1].nivel, 3); // 30 págs >= meta
  });

  test('calcularEstagioLeitor() retorna nível, badge e ícone Lucide apropriado', () => {
    const estagio = GamificacaoLeituras.calcularEstagioLeitor(350, 5);
    assert.strictEqual(estagio.badge, 'NÍVEL 3');
    assert.strictEqual(estagio.iconName, 'book-open');
    assert.ok(estagio.pct >= 50);
  });
});



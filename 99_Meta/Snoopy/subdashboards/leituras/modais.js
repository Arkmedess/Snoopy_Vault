/**
 * Snoopy Vault - Submódulo: Modais do Dashboard de Leituras
 * Gerencia a atualização de progresso, inserção de anotações/citações,
 * vinculação com matérias de estudo e busca/importação de livros via Google Books API.
 *
 * @module subdashboards/leituras/modais
 */

class ModaisLeituras {
  /**
   * Inicializa o gerenciador de modais de leituras.
   *
   * @param {object} ctx - Contexto de execução e dependências.
   * @param {object} ctx.app - Instância do Obsidian App.
   * @param {Function} [ctx.onReload] - Callback para recarregar o bookshelf após alterações.
   * @param {Function} [ctx.onSelectLivro] - Callback para selecionar um livro recém-criado.
   */
  constructor(ctx = {}) {
    this.app = ctx.app;
    this.onReload = ctx.onReload || (() => {});
    this.onSelectLivro = ctx.onSelectLivro || (() => {});
  }

  /**
   * Exibe notificação de forma defensiva no Obsidian.
   *
   * @private
   * @param {string} msg - Mensagem a exibir.
   */
  _notify(msg) {
    if (typeof Notice !== 'undefined') {
      new Notice(msg);
    } else {
      console.warn(`[Snoopy Leituras] ${msg}`);
    }
  }

  /**
   * Extrai dados estruturados (sinopse, citações, reflexões e estudos vinculados)
   * a partir do texto markdown de uma nota de livro.
   *
   * @param {string} markdown - Conteúdo bruto da nota markdown.
   * @returns {object} Objeto com sinopse, licoes, reflexoes e estudosVinculados.
   */
  static extrairDadosLivro(markdown = '') {
    const resultado = {
      sinopse: '',
      licoes: [],
      reflexoes: [],
      estudosVinculados: []
    };

    if (!markdown) return resultado;

    // 1. Extração de sinopse
    const matchDesc = markdown.match(/description:\s*["']?([^"'\n\r]+)["']?/);
    if (matchDesc && matchDesc[1].trim()) {
      resultado.sinopse = matchDesc[1].trim();
    } else {
      const matchSinopseSec = markdown.match(/##\s*📌\s*Sinopse[^\n]*\n+([\s\S]*?)(?=\n##|\n---|$)/i);
      if (matchSinopseSec && matchSinopseSec[1].trim()) {
        resultado.sinopse = matchSinopseSec[1].replace(/^{{description}}$/, '').trim();
      }
    }

    // 2. Extração de Lições e Citações
    const matchLicoes = markdown.match(/##\s*💡\s*Principais Lições[^\n]*\n+([\s\S]*?)(?=\n##|\n---|$)/i);
    if (matchLicoes) {
      resultado.licoes = matchLicoes[1]
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.startsWith('- ') && l.length > 2)
        .map(l => l.replace(/^- \s*/, ''));
    }

    // 3. Extração de Reflexões & Resumo
    const matchReflexoes = markdown.match(/##\s*🧠\s*Minhas Reflexões[^\n]*\n+([\s\S]*?)(?=\n##|\n---|$)/i);
    if (matchReflexoes) {
      resultado.reflexoes = matchReflexoes[1]
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.startsWith('- ') && l.length > 2)
        .map(l => l.replace(/^- \s*/, ''));
    }

    // 4. Extração de Estudos Vinculados
    const matchFrontmatterEstudos = markdown.match(/estudos_vinculados:\s*(\[[^\]]*\]|(?:\n\s*-\s*[^\n]+)+)/);
    if (matchFrontmatterEstudos) {
      const links = matchFrontmatterEstudos[1].match(/\[\[([^\]]+)\]\]/g);
      if (links) {
        links.forEach(link => {
          const limpo = link.replace(/[\[\]]/g, '').trim();
          if (limpo && !resultado.estudosVinculados.includes(limpo)) {
            resultado.estudosVinculados.push(limpo);
          }
        });
      }
    }

    const matchEstudosSec = markdown.match(/##\s*🔗\s*Estudos[^\n]*\n+([\s\S]*?)(?=\n##|\n---|$)/i);
    if (matchEstudosSec) {
      const linksSec = matchEstudosSec[1].match(/\[\[([^\]]+)\]\]/g);
      if (linksSec) {
        linksSec.forEach(link => {
          const limpo = link.replace(/[\[\]]/g, '').trim();
          if (limpo && !resultado.estudosVinculados.includes(limpo)) {
            resultado.estudosVinculados.push(limpo);
          }
        });
      }
    }

    return resultado;
  }

  /**
   * Catálogo canônico de temas e gêneros isolados sem & (conforme taxonomia padrão).
   */
  static GENEROS_PADRAO = [
    'Romance',
    'Fantasia',
    'Ficção Científica',
    'Aventura',
    'Suspense',
    'Mistério',
    'Terror',
    'Horror',
    'Ficção Histórica',
    'Contos',
    'Crônicas',
    'Poesia',
    'Quadrinhos',
    'Mangá',
    'Desenvolvimento Pessoal',
    'Hábitos',
    'Tecnologia',
    'Programação',
    'Filosofia',
    'Psicologia',
    'Ciência',
    'Matemática',
    'Negócios',
    'Gestão',
    'Empreendedorismo',
    'História',
    'Biografia',
    'Produtividade',
    'Estudos',
    'Finanças',
    'Economia',
    'Design',
    'Arquitetura',
    'Geral'
  ];

  /**
   * Normaliza termos de gênero vindos de APIs externas para os temas padrão isolados.
   *
   * @param {string} termoBruto - Termo original.
   * @returns {string} Tema normalizado sem &.
   */
  static normalizarGenero(termoBruto = '') {
    if (!termoBruto || typeof termoBruto !== 'string') return 'Geral';
    const t = termoBruto.trim().toLowerCase();

    if (/self-help|personal development|autoajuda|auto-ajuda/.test(t)) return 'Desenvolvimento Pessoal';
    if (/habit|hábitos|habits/.test(t)) return 'Hábitos';
    if (/programming|software|coding|programação/.test(t)) return 'Programação';
    if (/computer|computador|technology|tecnologia/.test(t)) return 'Tecnologia';
    if (/science fiction|sci-fi|ficção científica/.test(t)) return 'Ficção Científica';
    if (/fantasy|fantasia|magic/.test(t)) return 'Fantasia';
    if (/romance|love/.test(t)) return 'Romance';
    if (/adventure|aventura/.test(t)) return 'Aventura';
    if (/mystery|mistério|detective/.test(t)) return 'Mistério';
    if (/suspense|thriller/.test(t)) return 'Suspense';
    if (/horror|terror/.test(t)) return 'Terror';
    if (/philosophy|filosofia/.test(t)) return 'Filosofia';
    if (/psychology|psicologia/.test(t)) return 'Psicologia';
    if (/business|negócios|negocios/.test(t)) return 'Negócios';
    if (/management|gestão|gestao|leadership/.test(t)) return 'Gestão';
    if (/finance|finanças|financas|investing/.test(t)) return 'Finanças';
    if (/economic|economia/.test(t)) return 'Economia';
    if (/history|história|historia/.test(t)) return 'História';
    if (/biography|biografia|memoir/.test(t)) return 'Biografia';
    if (/productivity|produtividade/.test(t)) return 'Produtividade';
    if (/education|estudo|estudos|study/.test(t)) return 'Estudos';
    if (/comic|graphic novel|quadrinho/.test(t)) return 'Quadrinhos';
    if (/manga|mangá/.test(t)) return 'Mangá';
    if (/poetry|poesia/.test(t)) return 'Poesia';
    if (/art|design/.test(t)) return 'Design';

    // Remove qualquer caractere & e pontuação solta
    const semE = termoBruto.split('&')[0].trim();
    return semE || termoBruto.trim();
  }

  /**
   * Mescla e cruza os metadados de múltiplas fontes (Google Books, Open Library e BrasilAPI).
   *
   * @param {object} [google] - Metadados da Google Books API.
   * @param {object} [openLib] - Metadados da Open Library API.
   * @param {object} [brasilApi] - Metadados da BrasilAPI.
   * @returns {object} Objeto consolidado com os melhores metadados.
   */
  static mesclarMetadados(google = null, openLib = null, brasilApi = null) {
    const title = (google && google.title) || (brasilApi && brasilApi.title) || (openLib && openLib.title) || 'Sem título';
    const author = (google && google.author) || (brasilApi && brasilApi.author) || (openLib && openLib.author) || 'Autor desconhecido';

    // Sinopse: preferência para a descrição mais completa (maior tamanho e sem tags html brutas)
    const gDesc = (google && google.description) ? String(google.description).replace(/<[^>]+>/g, '').trim() : '';
    const oDesc = (openLib && openLib.description) ? String(openLib.description).replace(/<[^>]+>/g, '').trim() : '';
    const bDesc = (brasilApi && brasilApi.description) ? String(brasilApi.description).replace(/<[^>]+>/g, '').trim() : '';

    let description = gDesc;
    if (!description || (oDesc && oDesc.length > description.length && !description.includes('...'))) {
      description = oDesc || description;
    }
    if (!description && bDesc) {
      description = bDesc;
    }

    // Gêneros e Categorias: fusão e normalização para temas padrão isolados sem &
    const listaGeneros = new Set();
    const adicionarNormalizado = (termo) => {
      const norm = ModaisLeituras.normalizarGenero(termo);
      if (norm && norm !== 'Geral') listaGeneros.add(norm);
    };

    if (google && google.category) {
      String(google.category).split(/[\/,;]+/).forEach(c => adicionarNormalizado(c.trim()));
    }
    if (google && Array.isArray(google.categories)) {
      google.categories.forEach(c => {
        String(c).split(/[\/,;]+/).forEach(sub => adicionarNormalizado(sub.trim()));
      });
    }
    if (openLib && Array.isArray(openLib.subjects)) {
      openLib.subjects.slice(0, 8).forEach(s => adicionarNormalizado(String(s).trim()));
    }
    if (brasilApi && Array.isArray(brasilApi.subjects)) {
      brasilApi.subjects.forEach(s => adicionarNormalizado(String(s).trim()));
    }

    const categoriesArray = Array.from(listaGeneros);
    const categoryStr = categoriesArray.length > 0 ? categoriesArray[0] : 'Geral';

    // Capa: preferência para imagem de alta resolução da Open Library ou Google Books
    let cover = (openLib && openLib.cover) || (google && google.cover) || (brasilApi && brasilApi.cover) || null;
    if (cover && cover.startsWith('http://')) {
      cover = cover.replace('http://', 'https://');
    }

    const pages = Number(google && google.pages) || Number(openLib && openLib.pages) || Number(brasilApi && brasilApi.pages) || 200;
    const year = (google && google.year) || (openLib && openLib.year) || (brasilApi && brasilApi.year) || '';
    const publisher = (google && google.publisher) || (brasilApi && brasilApi.publisher) || (openLib && openLib.publisher) || '';
    const isbn = (google && google.isbn) || (brasilApi && brasilApi.isbn) || (openLib && openLib.isbn) || '';

    return {
      title,
      author,
      description,
      categories: categoriesArray.length > 0 ? categoriesArray : ['Geral'],
      category: categoryStr,
      cover,
      pages,
      year,
      publisher,
      isbn
    };
  }

  /**
   * Consulta Google Books API, Open Library API e BrasilAPI em paralelo,
   * cruzando e mesclando os melhores metadados disponíveis de forma gratuita.
   *
   * @param {string} termo - Termo de busca (título, autor ou ISBN).
   * @returns {Promise<Array<object>>} Lista de livros consolidados.
   */
  static async buscarLivrosCruzados(termo = '') {
    if (!termo || !termo.trim()) return [];
    const query = termo.trim();
    const isIsbn = /^[0-9\-]{10,17}$/.test(query);

    const promessas = [
      // 1. Google Books API
      fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=6&langRestrict=pt`)
        .then(r => r.json())
        .catch(() => ({ items: [] })),
      // 2. Open Library Search API
      fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=6`)
        .then(r => r.json())
        .catch(() => ({ docs: [] }))
    ];

    // 3. BrasilAPI caso seja ISBN
    if (isIsbn) {
      const isbnLimpo = query.replace(/[^0-9X]/gi, '');
      promessas.push(
        fetch(`https://brasilapi.com.br/api/isbn/v1/${isbnLimpo}`)
          .then(r => r.json())
          .catch(() => null)
      );
    }

    const resultados = await Promise.allSettled(promessas);

    const googleItems = (resultados[0] && resultados[0].status === 'fulfilled' && resultados[0].value && resultados[0].value.items) || [];
    const openLibDocs = (resultados[1] && resultados[1].status === 'fulfilled' && resultados[1].value && resultados[1].value.docs) || [];
    const brasilData = (resultados[2] && resultados[2].status === 'fulfilled' && resultados[2].value && !resultados[2].value.message) ? resultados[2].value : null;

    // Normaliza itens da Open Library
    const openLibFormatados = openLibDocs.map(doc => {
      const coverId = doc.cover_i;
      return {
        title: doc.title || '',
        author: doc.author_name ? doc.author_name.join(', ') : '',
        subjects: doc.subject || doc.subject_facet || [],
        cover: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null,
        pages: doc.number_of_pages_median || 200,
        year: doc.first_publish_year ? String(doc.first_publish_year) : '',
        publisher: doc.publisher ? doc.publisher[0] : '',
        isbn: doc.isbn ? doc.isbn[0] : ''
      };
    });

    const brasilFormatado = brasilData ? {
      title: brasilData.title || '',
      author: brasilData.authors ? brasilData.authors.join(', ') : '',
      description: brasilData.synopsis || '',
      subjects: brasilData.subjects || [],
      pages: brasilData.page_count || 200,
      year: brasilData.year ? String(brasilData.year) : '',
      publisher: brasilData.publisher || '',
      cover: brasilData.cover_url || null,
      isbn: brasilData.isbn || query
    } : null;

    const listaFinal = [];

    // Cruzamento Google + Open Library + BrasilAPI
    if (googleItems.length > 0) {
      googleItems.forEach(item => {
        const info = item.volumeInfo || {};
        const img = info.imageLinks ? (info.imageLinks.thumbnail || info.imageLinks.smallThumbnail) : null;
        const gBook = {
          title: info.title || 'Sem título',
          author: info.authors ? info.authors.join(', ') : 'Autor desconhecido',
          pages: info.pageCount || 200,
          year: info.publishedDate ? info.publishedDate.slice(0, 4) : '',
          cover: img ? img.replace(/^http:/, 'https:') : null,
          description: info.description || '',
          publisher: info.publisher || '',
          category: info.categories ? info.categories[0] : 'Geral',
          categories: info.categories || [],
          isbn: info.industryIdentifiers ? info.industryIdentifiers[0].identifier : ''
        };

        const matchOL = openLibFormatados.find(ol => {
          const t1 = gBook.title.toLowerCase();
          const t2 = ol.title.toLowerCase();
          return t1.includes(t2) || t2.includes(t1);
        });

        const unificado = ModaisLeituras.mesclarMetadados(gBook, matchOL, brasilFormatado);
        listaFinal.push(unificado);
      });
    } else if (openLibFormatados.length > 0) {
      openLibFormatados.forEach(ol => {
        const unificado = ModaisLeituras.mesclarMetadados(null, ol, brasilFormatado);
        listaFinal.push(unificado);
      });
    } else if (brasilFormatado) {
      listaFinal.push(ModaisLeituras.mesclarMetadados(null, null, brasilFormatado));
    }

    return listaFinal;
  }


  /**
   * Registra a quantidade de páginas lidas na nota diária (01_Inbox/Diário/YYYY-MM-DD.md).
   *
   * @param {number} deltaPaginas - Quantidade de páginas a somar no dia.
   */
  async registrarLeituraDiaria(deltaPaginas = 0) {
    if (!deltaPaginas || deltaPaginas <= 0) return;
    try {
      const dataHoje = new Date().toISOString().slice(0, 10);
      const dailyPath = `01_Inbox/Diário/${dataHoje}.md`;
      let dailyFile = this.app.vault.getAbstractFileByPath(dailyPath);

      if (!dailyFile) {
        const template = `---\ndate: ${dataHoje}\npaginas_lidas: ${deltaPaginas}\ntags:\n  - diario\n---\n\n# 📅 ${dataHoje}\n\n---\n\n## Hábitos\n- [ ] Leitura 25 págs\n\n---\n\n[[00_Home/Home|← Voltar ao Painel Principal]]\n`;
        dailyFile = await this.app.vault.create(dailyPath, template);
      } else if (this.app.fileManager && typeof this.app.fileManager.processFrontMatter === 'function') {
        await this.app.fileManager.processFrontMatter(dailyFile, (fm) => {
          fm.paginas_lidas = (Number(fm.paginas_lidas) || 0) + deltaPaginas;
        });
      } else {
        const raw = await this.app.vault.read(dailyFile);
        let updated = raw;
        if (/paginas_lidas:\s*\d+/.test(updated)) {
          const match = updated.match(/paginas_lidas:\s*(\d+)/);
          const total = (Number(match[1]) || 0) + deltaPaginas;
          updated = updated.replace(/paginas_lidas:\s*\d+/, `paginas_lidas: ${total}`);
        } else if (updated.startsWith('---')) {
          updated = updated.replace(/^---\n/, `---\npaginas_lidas: ${deltaPaginas}\n`);
        }
        await this.app.vault.modify(dailyFile, updated);
      }
    } catch (e) {
      console.warn('[ModaisLeituras] Falha ao registrar páginas na nota diária:', e);
    }
  }

  /**
   * Incrementa rapidamente o número de páginas lidas e atualiza status defensivamente.
   *
   * @param {object} livro - Objeto do livro no Dataview.
   * @param {number} delta - Quantidade de páginas a somar (ex: 5, 10).
   */
  async incrementarPaginas(livro, delta = 0) {
    if (!livro || !livro.file || !livro.file.path) return;
    const file = this.app.vault.getAbstractFileByPath(livro.file.path);
    if (!file) return;

    const raw = await this.app.vault.read(file);
    const totPag = Number(livro.total_pages) || 100;
    const curAtual = Number(livro.current_page) || 0;
    const novoCur = Math.min(totPag, Math.max(0, curAtual + delta));

    let updated = raw;
    if (/current_page:\s*\d+/.test(updated)) {
      updated = updated.replace(/current_page:\s*\d+/, `current_page: ${novoCur}`);
    } else if (updated.startsWith('---')) {
      updated = updated.replace(/^---\n/, `---\ncurrent_page: ${novoCur}\n`);
    }

    if (novoCur >= totPag) {
      if (/status:\s*["'][^"']+["']/.test(updated)) {
        updated = updated.replace(/status:\s*["'][^"']+["']/, `status: "Lido"`);
      }
      const dataHoje = new Date().toISOString().slice(0, 10);
      if (/finished:\s*["']?[^"'\n\r]*["']?/.test(updated)) {
        updated = updated.replace(/finished:\s*["']?[^"'\n\r]*["']?/, `finished: ${dataHoje}`);
      }
    }

    await this.app.vault.modify(file, updated);
    await this.registrarLeituraDiaria(novoCur - curAtual);
    this._notify(`Progresso: ${novoCur}/${totPag} páginas (${Math.round((novoCur / totPag) * 100)}%)`);
    this.onReload();
  }

  /**
   * Atualiza a nota de avaliação por estrelas (1 a 5) no frontmatter do livro.
   *
   * @param {object} livro - Objeto do livro no Dataview.
   * @param {number} rating - Nota em estrelas (0 a 5).
   */
  async atualizarRating(livro, rating = 0) {
    if (!livro || !livro.file || !livro.file.path) return;
    const file = this.app.vault.getAbstractFileByPath(livro.file.path);
    if (!file) return;

    const raw = await this.app.vault.read(file);
    let updated = raw;
    const clampedRating = Math.max(0, Math.min(5, Math.round(rating)));

    if (/rating:\s*\d+/.test(updated)) {
      updated = updated.replace(/rating:\s*\d+/, `rating: ${clampedRating}`);
    } else if (updated.startsWith('---')) {
      updated = updated.replace(/^---\n/, `---\nrating: ${clampedRating}\n`);
    }

    await this.app.vault.modify(file, updated);
    this._notify(`Avaliação salva: ${'★'.repeat(clampedRating)}${'☆'.repeat(5 - clampedRating)}`);
    this.onReload();
  }

  /**
   * Insere uma nova anotação ou citação no corpo markdown do livro sob a seção adequada.
   *
   * @param {object} livro - Objeto do livro.
   * @param {object} param1 - Opções da anotação.
   * @param {'licao'|'reflexao'} param1.tipo - Seção de destino.
   * @param {string} param1.texto - Conteúdo textual da anotação.
   * @param {number|string} [param1.pagina] - Número da página opcional.
   */
  async inserirAnotacao(livro, { tipo = 'licao', texto = '', pagina = null }) {
    if (!livro || !livro.file || !livro.file.path || !texto.trim()) return;
    const file = this.app.vault.getAbstractFileByPath(livro.file.path);
    if (!file) return;

    const raw = await this.app.vault.read(file);
    const pagStr = pagina ? ` (p. ${pagina})` : '';
    const novaLinha = `- "${texto.trim().replace(/^"+|"+$/g, '')}"${pagStr}`;

    let updated = raw;
    const secaoRegex = tipo === 'reflexao'
      ? /(##\s*🧠\s*Minhas Reflexões[^\n]*\n)/i
      : /(##\s*💡\s*Principais Lições[^\n]*\n)/i;

    if (secaoRegex.test(updated)) {
      updated = updated.replace(secaoRegex, `$1${novaLinha}\n`);
    } else {
      updated += `\n\n${tipo === 'reflexao' ? '## 🧠 Minhas Reflexões & Resumo' : '## 💡 Principais Lições & Citações'}\n${novaLinha}\n`;
    }

    await this.app.vault.modify(file, updated);
    this._notify(`Nova anotação registrada em ${livro.title || livro.file.name}!`);
    this.onReload();
  }

  /**
   * Remove uma anotação ou citação específica da nota markdown do livro.
   *
   * @param {object} livro - Objeto do livro no Dataview.
   * @param {string} textoAnotacao - Trecho do texto da anotação a remover.
   */
  async removerAnotacao(livro, textoAnotacao = '') {
    if (!livro || !livro.file || !livro.file.path || !textoAnotacao.trim()) return;
    const file = this.app.vault.getAbstractFileByPath(livro.file.path);
    if (!file) return;

    const raw = await this.app.vault.read(file);
    const trechoLimpo = textoAnotacao.trim().replace(/^"+|"+$/g, '').slice(0, 30);
    const linhas = raw.split('\n');

    const linhasFiltradas = linhas.filter(linha => {
      if (linha.startsWith('- ') && linha.includes(trechoLimpo)) {
        return false;
      }
      return true;
    });

    const novoConteudo = linhasFiltradas.join('\n');
    await this.app.vault.modify(file, novoConteudo);
    this._notify('Anotação removida da nota.');
    this.onReload();
  }

  /**
   * Vincula uma matéria de estudo da pasta 03_Estudos na nota do livro.
   *
   * @param {object} livro - Objeto do livro.
   * @param {string} estudoNome - Título da matéria de estudo.
   */
  async vincularEstudo(livro, estudoNome = '') {
    if (!livro || !livro.file || !livro.file.path || !estudoNome.trim()) return;
    const file = this.app.vault.getAbstractFileByPath(livro.file.path);
    if (!file) return;

    const limpo = estudoNome.replace(/[\[\]]/g, '').trim();
    const raw = await this.app.vault.read(file);

    if (raw.includes(`[[${limpo}]]`)) {
      this._notify(`Matéria "${limpo}" já está vinculada.`);
      return;
    }

    let updated = raw;
    const linkStr = `[[${limpo}]]`;

    // 1. Frontmatter
    if (/estudos_vinculados:\s*\[\]/.test(updated)) {
      updated = updated.replace(/estudos_vinculados:\s*\[\]/, `estudos_vinculados:\n  - "${linkStr}"`);
    } else if (/estudos_vinculados:/.test(updated)) {
      updated = updated.replace(/estudos_vinculados:\s*/, `estudos_vinculados:\n  - "${linkStr}"\n`);
    } else if (updated.startsWith('---')) {
      updated = updated.replace(/^---\n/, `---\nestudos_vinculados:\n  - "${linkStr}"\n`);
    }

    // 2. Seção Markdown
    const secaoRegex = /(##\s*🔗\s*Estudos[^\n]*\n)/i;
    if (secaoRegex.test(updated)) {
      updated = updated.replace(secaoRegex, `$1- ${linkStr}\n`);
    } else {
      updated += `\n\n## 🔗 Estudos & Disciplinas Vinculadas\n- ${linkStr}\n`;
    }

    await this.app.vault.modify(file, updated);
    this._notify(`Matéria "${limpo}" vinculada com sucesso!`);
    this.onReload();
  }

  /**
   * Desvincula uma matéria de estudo da nota do livro (frontmatter e seção markdown).
   *
   * @param {object} livro - Objeto do livro no Dataview.
   * @param {string} estudoNome - Título da matéria de estudo a desvincular.
   */
  async desvincularEstudo(livro, estudoNome = '') {
    if (!livro || !livro.file || !livro.file.path || !estudoNome.trim()) return;
    const file = this.app.vault.getAbstractFileByPath(livro.file.path);
    if (!file) return;

    const limpo = estudoNome.replace(/[\[\]]/g, '').trim();
    const raw = await this.app.vault.read(file);
    const linhas = raw.split('\n');

    // Filtra linhas que contenham o link do estudo, seja no frontmatter ou na lista markdown
    const linkPadrao = `[[${limpo}]]`;
    const linhasFiltradas = linhas.filter(l => {
      if (l.includes(linkPadrao) || l.includes(`"${linkPadrao}"`) || l.includes(`'${linkPadrao}'`)) {
        return false;
      }
      return true;
    });

    const updated = linhasFiltradas.join('\n');
    await this.app.vault.modify(file, updated);
    this._notify(`Matéria "${limpo}" desvinculada.`);
    this.onReload();
  }

  /**
   * Adiciona um novo tema/gênero ao livro no frontmatter.
   *
   * @param {object} livro - Objeto do livro no Dataview.
   * @param {string} novoGenero - Nome do tema/gênero a adicionar.
   */
  async adicionarGenero(livro, novoGenero = '') {
    if (!livro || !novoGenero || !novoGenero.trim()) return;
    const genNormalizado = ModaisLeituras.normalizarGenero(novoGenero.trim());
    if (!genNormalizado) return;

    let categoriasAtuais = [];
    if (Array.isArray(livro.categories) && livro.categories.length > 0) {
      categoriasAtuais = [...livro.categories];
    } else if (livro.category && livro.category !== 'Geral') {
      categoriasAtuais = [livro.category];
    }

    if (categoriasAtuais.includes(genNormalizado)) {
      this._notify(`O gênero "${genNormalizado}" já está cadastrado.`);
      return;
    }

    categoriasAtuais.push(genNormalizado);
    // Remove "Geral" se houver gêneros específicos
    if (categoriasAtuais.length > 1 && categoriasAtuais.includes('Geral')) {
      categoriasAtuais = categoriasAtuais.filter(g => g !== 'Geral');
    }

    await this.salvarMetadados(livro, {
      category: categoriasAtuais[0],
      categories: categoriasAtuais
    });
    this._notify(`Gênero "${genNormalizado}" adicionado!`);
  }

  /**
   * Remove um tema/gênero do livro no frontmatter.
   *
   * @param {object} livro - Objeto do livro no Dataview.
   * @param {string} genero - Gênero a ser removido.
   */
  async removerGenero(livro, genero = '') {
    if (!livro || !genero || !genero.trim()) return;
    const genLimpo = genero.trim().toLowerCase();

    let categoriasAtuais = [];
    if (Array.isArray(livro.categories) && livro.categories.length > 0) {
      categoriasAtuais = [...livro.categories];
    } else if (livro.category) {
      categoriasAtuais = [livro.category];
    }

    categoriasAtuais = categoriasAtuais.filter(g => g.trim().toLowerCase() !== genLimpo);
    if (categoriasAtuais.length === 0) {
      categoriasAtuais = ['Geral'];
    }

    await this.salvarMetadados(livro, {
      category: categoriasAtuais[0],
      categories: categoriasAtuais
    });
    this._notify(`Gênero "${genero}" removido.`);
  }

  /**
   * Abre um modal compacto e monocromático para selecionar ou cadastrar um novo gênero no livro.
   *
   * @param {object} livro - Objeto do livro no Dataview.
   */
  abrirModalAdicionarGenero(livro) {
    if (!livro) return;

    const modalBg = document.createElement('div');
    modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';

    const modalBox = document.createElement('div');
    modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 380px; width: 100%; padding: 18px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 12px;';

    const categoriasAtuais = Array.isArray(livro.categories) ? livro.categories : (livro.category ? [livro.category] : []);
    const opcoesDisponiveis = ModaisLeituras.GENEROS_PADRAO.filter(g => !categoriasAtuais.includes(g));

    modalBox.innerHTML = `
      <div class="snoopy-card-header">
        <span class="snoopy-section-title" style="font-size: 13px;">Adicionar Gênero / Tema</span>
        <button id="modal-close-gen" class="snoopy-modal-close" title="Fechar"></button>
      </div>

      <div>
        <div class="snoopy-modal-label">Selecione da Lista:</div>
        <select id="modal-select-gen" class="snoopy-form-select">
          <option value="">-- Escolha um gênero padrão --</option>
          ${opcoesDisponiveis.map(g => `<option value="${g}">${g}</option>`).join('')}
        </select>
      </div>

      <div>
        <div class="snoopy-modal-label">Ou Cadastre um Novo:</div>
        <input id="modal-input-new-gen" class="snoopy-form-input" type="text" placeholder="Ex: Cyberpunk, Teoria Crítica...">
      </div>

      <div class="snoopy-toolbar" style="justify-content: flex-end; margin-top: 4px;">
        <button id="modal-cancel-gen" class="snoopy-btn-action snoopy-btn-sm">Cancelar</button>
        <button id="modal-confirm-gen" class="snoopy-btn-primary snoopy-btn-sm">Adicionar</button>
      </div>
    `;

    modalBg.appendChild(modalBox);
    document.body.appendChild(modalBg);

    const fechar = () => { if (modalBg.parentNode) document.body.removeChild(modalBg); };
    modalBg.addEventListener('click', (e) => { if (e.target === modalBg) fechar(); });

    const btnClose = modalBox.querySelector('#modal-close-gen');
    if (btnClose) btnClose.onclick = fechar;
    const btnCancel = modalBox.querySelector('#modal-cancel-gen');
    if (btnCancel) btnCancel.onclick = fechar;

    const selectGen = modalBox.querySelector('#modal-select-gen');
    const inputNewGen = modalBox.querySelector('#modal-input-new-gen');

    const btnConfirm = modalBox.querySelector('#modal-confirm-gen');
    if (btnConfirm) {
      btnConfirm.onclick = async () => {
        const valNovo = inputNewGen ? inputNewGen.value.trim() : '';
        const valSelect = selectGen ? selectGen.value.trim() : '';
        const generoParaAdicionar = valNovo || valSelect;

        if (generoParaAdicionar) {
          await this.adicionarGenero(livro, generoParaAdicionar);
          fechar();
        }
      };
    }
  }

  /**
   * Atualiza metadados completos do livro (autor, categoria, capa, sinopse, páginas, séries) no frontmatter e markdown.
   *
   * @param {object} livro - Objeto do livro no Dataview.
   * @param {object} dados - Metadados a atualizar.
   */
  async salvarMetadados(livro, dados = {}) {
    if (!livro || !livro.file || !livro.file.path) return;
    const file = this.app.vault.getAbstractFileByPath(livro.file.path);
    if (!file) return;

    const raw = await this.app.vault.read(file);
    let updated = raw;

    const { author, category, categories, cover, description, total_pages, series, series_index } = dados;

    if (author !== undefined) {
      if (/author:\s*["'][^"']*["']/.test(updated)) {
        updated = updated.replace(/author:\s*["'][^"']*["']/, `author: "${author}"`);
      } else if (/author:\s*[^\n]+/.test(updated)) {
        updated = updated.replace(/author:\s*[^\n]+/, `author: "${author}"`);
      }
    }

    if (category !== undefined) {
      if (/category:\s*["'][^"']*["']/.test(updated)) {
        updated = updated.replace(/category:\s*["'][^"']*["']/, `category: "${category}"`);
      } else if (/category:\s*[^\n]+/.test(updated)) {
        updated = updated.replace(/category:\s*[^\n]+/, `category: "${category}"`);
      } else if (updated.startsWith('---')) {
        updated = updated.replace(/^---\n/, `---\ncategory: "${category}"\n`);
      }
    }

    if (categories !== undefined && Array.isArray(categories)) {
      const catsYaml = `categories:\n` + categories.map(c => `  - "${c}"`).join('\n');
      if (/categories:\s*(\[[^\]]*\]|(?:\n\s*-\s*[^\n]+)+)/.test(updated)) {
        updated = updated.replace(/categories:\s*(\[[^\]]*\]|(?:\n\s*-\s*[^\n]+)+)/, catsYaml);
      } else if (updated.startsWith('---')) {
        updated = updated.replace(/^---\n/, `---\n${catsYaml}\n`);
      }
    }

    if (series !== undefined) {
      if (/series:\s*["'][^"']*["']/.test(updated)) {
        updated = updated.replace(/series:\s*["'][^"']*["']/, `series: "${series}"`);
      } else if (/series:\s*[^\n]+/.test(updated)) {
        updated = updated.replace(/series:\s*[^\n]+/, `series: "${series}"`);
      } else if (updated.startsWith('---')) {
        updated = updated.replace(/^---\n/, `---\nseries: "${series}"\n`);
      }
    }

    if (series_index !== undefined) {
      const idxNum = Number(series_index) || 1;
      if (/series_index:\s*\d+/.test(updated)) {
        updated = updated.replace(/series_index:\s*\d+/, `series_index: ${idxNum}`);
      } else if (updated.startsWith('---')) {
        updated = updated.replace(/^---\n/, `---\nseries_index: ${idxNum}\n`);
      }
    }

    if (cover !== undefined) {
      if (/cover:\s*["'][^"']*["']/.test(updated)) {
        updated = updated.replace(/cover:\s*["'][^"']*["']/, `cover: "${cover}"`);
      } else if (/cover:\s*[^\n]+/.test(updated)) {
        updated = updated.replace(/cover:\s*[^\n]+/, `cover: "${cover}"`);
      } else if (updated.startsWith('---')) {
        updated = updated.replace(/^---\n/, `---\ncover: "${cover}"\n`);
      }
    }

    if (description !== undefined) {
      const cleanDesc = description.replace(/[\n\r]+/g, ' ').replace(/"/g, '\\"');
      if (/description:\s*["'][^"']*["']/.test(updated)) {
        updated = updated.replace(/description:\s*["'][^"']*["']/, `description: "${cleanDesc}"`);
      } else if (updated.startsWith('---')) {
        updated = updated.replace(/^---\n/, `---\ndescription: "${cleanDesc}"\n`);
      }

      // Atualiza também no corpo sob ## 📌 Sinopse
      const sinopseRegex = /(##\s*📌\s*Sinopse[^\n]*\n+)([\s\S]*?)(?=\n##|\n---|$)/i;
      if (sinopseRegex.test(updated)) {
        updated = updated.replace(sinopseRegex, `$1${description}\n`);
      }
    }

    if (total_pages !== undefined) {
      const totNum = Number(total_pages) || 100;
      if (/total_pages:\s*\d+/.test(updated)) {
        updated = updated.replace(/total_pages:\s*\d+/, `total_pages: ${totNum}`);
      }
    }

    await this.app.vault.modify(file, updated);
    this._notify('Metadados do livro atualizados!');
    this.onReload();
  }

  /**
   * Exclui o arquivo da nota do livro movendo para a lixeira do vault.
   *
   * @param {object} livro - Objeto do livro no Dataview.
   */
  async excluirLivro(livro) {
    if (!livro || !livro.file || !livro.file.path) return;
    const file = this.app.vault.getAbstractFileByPath(livro.file.path);
    if (!file) return;

    if (typeof this.app.vault.trash === 'function') {
      await this.app.vault.trash(file, false);
    } else if (typeof this.app.vault.delete === 'function') {
      await this.app.vault.delete(file);
    }

    this._notify(`Livro "${livro.title || livro.file.name}" movido para a lixeira.`);
    this.onReload();
  }

  /**
   * Abre o modal de edição de metadados rápidos (capa, sinopse, gênero canônico/novo, autor e páginas).
   *
   * @param {object} livro - Objeto do livro no Dataview.
   */
  abrirModalEditarMetadados(livro) {
    if (!livro) return;

    const modalBg = document.createElement('div');
    modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';

    const modalBox = document.createElement('div');
    modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 480px; width: 100%; max-height: 85vh; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 12px;';

    const coverAtual = livro.cover || '';
    const descAtual = livro.description || '';
    const catAtual = ModaisLeituras.normalizarGenero(livro.category || 'Geral');
    const autorAtual = livro.author || '';
    const totPag = Number(livro.total_pages) || 100;
    const seriesAtual = livro.series || '';
    const seriesIndexAtual = Number(livro.series_index) || 1;

    const catsExistentes = Array.isArray(livro.categories) && livro.categories.length > 0
      ? livro.categories.map(c => ModaisLeituras.normalizarGenero(c))
      : [catAtual];
    const categoriasStr = catsExistentes.join(', ');

    // Lista de gêneros incluindo padrão e o atual se customizado
    const generosOpcoes = [...new Set([...ModaisLeituras.GENEROS_PADRAO, catAtual])].filter(Boolean);

    modalBox.innerHTML = `
      <div class="snoopy-card-header">
        <span class="snoopy-section-title">Editar Metadados do Livro</span>
        <button id="modal-close-edit" class="snoopy-modal-close" title="Fechar"></button>
      </div>

      <div style="display: flex; gap: 8px;">
        <div style="flex: 2;">
          <div class="snoopy-modal-label">Autor:</div>
          <input id="modal-edit-author" class="snoopy-form-input" type="text" value="${autorAtual.replace(/"/g, '&quot;')}">
        </div>
        <div style="flex: 2;">
          <div class="snoopy-modal-label">Adicionar Gênero Sugerido:</div>
          <select id="modal-edit-category-select" class="snoopy-form-select">
            <option value="">-- Selecione para adicionar --</option>
            ${generosOpcoes.map(g => `<option value="${g}">${g}</option>`).join('')}
            <option value="__custom__">+ Cadastrar Novo Gênero...</option>
          </select>
          <input id="modal-edit-custom-category" class="snoopy-form-input" type="text" placeholder="Digite o novo gênero..." style="display: none; margin-top: 6px;">
        </div>
      </div>

      <div>
        <div class="snoopy-modal-label">Gêneros / Temas Isolados (separados por vírgula):</div>
        <input id="modal-edit-categories" class="snoopy-form-input" type="text" placeholder="Ex: Ficção Científica, Filosofia, Aventura" value="${categoriasStr.replace(/"/g, '&quot;')}">
      </div>

      <div style="display: flex; gap: 8px;">
        <div style="flex: 3;">
          <div class="snoopy-modal-label">Série / Coleção (opcional):</div>
          <input id="modal-edit-series" class="snoopy-form-input" type="text" placeholder="Ex: Duna, O Senhor dos Anéis..." value="${seriesAtual.replace(/"/g, '&quot;')}">
        </div>
        <div style="flex: 1;">
          <div class="snoopy-modal-label">Vol. / Nº:</div>
          <input id="modal-edit-series-index" class="snoopy-form-input" type="number" min="1" value="${seriesIndexAtual}">
        </div>
      </div>

      <div style="display: flex; gap: 8px;">
        <div style="flex: 2;">
          <div class="snoopy-modal-label">URL da Imagem de Capa:</div>
          <input id="modal-edit-cover" class="snoopy-form-input" type="text" placeholder="https://..." value="${coverAtual.replace(/"/g, '&quot;')}">
        </div>
        <div style="flex: 1;">
          <div class="snoopy-modal-label">Total Páginas:</div>
          <input id="modal-edit-pages" class="snoopy-form-input" type="number" min="1" value="${totPag}">
        </div>
      </div>

      <div>
        <div class="snoopy-modal-label">Sinopse Editorial:</div>
        <textarea id="modal-edit-desc" class="snoopy-form-input" style="height: 90px; resize: vertical; line-height: 1.4;">${descAtual}</textarea>
      </div>

      <div class="snoopy-toolbar" style="justify-content: flex-end; margin-top: 6px;">
        <button id="modal-cancel-edit" class="snoopy-btn-action snoopy-btn-sm">Cancelar</button>
        <button id="modal-save-edit" class="snoopy-btn-primary snoopy-btn-sm">Salvar Alterações</button>
      </div>
    `;

    modalBg.appendChild(modalBox);
    document.body.appendChild(modalBg);

    const fechar = () => { if (modalBg.parentNode) document.body.removeChild(modalBg); };
    modalBg.addEventListener('click', (e) => { if (e.target === modalBg) fechar(); });

    const btnClose = modalBox.querySelector('#modal-close-edit');
    if (btnClose) btnClose.onclick = fechar;
    const btnCancel = modalBox.querySelector('#modal-cancel-edit');
    if (btnCancel) btnCancel.onclick = fechar;

    const selectCat = modalBox.querySelector('#modal-edit-category-select');
    const inputCustomCat = modalBox.querySelector('#modal-edit-custom-category');
    const inputCats = modalBox.querySelector('#modal-edit-categories');

    if (selectCat && inputCustomCat && inputCats) {
      selectCat.onchange = () => {
        if (selectCat.value === '__custom__') {
          inputCustomCat.style.display = 'block';
          inputCustomCat.focus();
        } else if (selectCat.value) {
          inputCustomCat.style.display = 'none';
          const novoGen = selectCat.value;
          const atuais = inputCats.value.split(',').map(s => s.trim()).filter(Boolean);
          if (!atuais.includes(novoGen)) {
            atuais.push(novoGen);
            inputCats.value = atuais.join(', ');
          }
        }
      };

      inputCustomCat.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const customVal = ModaisLeituras.normalizarGenero(inputCustomCat.value.trim());
          if (customVal && customVal !== 'Geral') {
            const atuais = inputCats.value.split(',').map(s => s.trim()).filter(Boolean);
            if (!atuais.includes(customVal)) {
              atuais.push(customVal);
              inputCats.value = atuais.join(', ');
            }
            inputCustomCat.value = '';
            inputCustomCat.style.display = 'none';
            selectCat.value = '';
          }
        }
      };
    }

    const btnSave = modalBox.querySelector('#modal-save-edit');
    if (btnSave) {
      btnSave.onclick = async () => {
        const author = modalBox.querySelector('#modal-edit-author').value.trim();
        const catInputStr = inputCats ? inputCats.value.trim() : catAtual;
        const rawList = catInputStr ? catInputStr.split(/[,;]+/).map(c => ModaisLeituras.normalizarGenero(c.trim())).filter(Boolean) : [catAtual];
        const categories = [...new Set(rawList)];
        const category = categories[0] || 'Geral';

        const series = modalBox.querySelector('#modal-edit-series').value.trim();
        const series_index = parseInt(modalBox.querySelector('#modal-edit-series-index').value, 10) || 1;

        const cover = modalBox.querySelector('#modal-edit-cover').value.trim();
        const description = modalBox.querySelector('#modal-edit-desc').value.trim();
        const total_pages = parseInt(modalBox.querySelector('#modal-edit-pages').value, 10) || totPag;

        await this.salvarMetadados(livro, {
          author,
          category,
          categories,
          series,
          series_index,
          cover,
          description,
          total_pages
        });
        fechar();
      };
    }
  }

  /**
   * Abre o modal de confirmação para excluir o livro com segurança.
   *
   * @param {object} livro - Objeto do livro no Dataview.
   */
  abrirModalConfirmarExclusao(livro) {
    if (!livro) return;

    const modalBg = document.createElement('div');
    modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';

    const modalBox = document.createElement('div');
    modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 12px; max-width: 400px; width: 100%; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 12px;';

    const livroTitulo = livro.title || (livro.file ? livro.file.name : 'Livro');

    modalBox.innerHTML = `
      <div class="snoopy-card-header" style="border-bottom-color: rgba(239, 68, 68, 0.3);">
        <span class="snoopy-section-title" style="color: #fca5a5;">Excluir Livro</span>
        <button id="modal-close-del" class="snoopy-modal-close" title="Fechar"></button>
      </div>

      <div style="font-size: 13px; color: var(--text-normal); line-height: 1.5;">
        Tem certeza que deseja remover <strong>"${livroTitulo}"</strong> da sua estante?
      </div>
      <div class="snoopy-meta" style="color: var(--text-muted); font-size: 11px;">
        O arquivo será movido para a lixeira do Obsidian. Suas anotações poderão ser recuperadas lá caso necessário.
      </div>

      <div class="snoopy-toolbar" style="justify-content: flex-end; margin-top: 10px;">
        <button id="modal-cancel-del" class="snoopy-btn-action snoopy-btn-sm">Cancelar</button>
        <button id="modal-confirm-del" class="snoopy-btn-danger snoopy-btn-sm">Confirmar Exclusão</button>
      </div>
    `;

    modalBg.appendChild(modalBox);
    document.body.appendChild(modalBg);

    const fechar = () => { if (modalBg.parentNode) document.body.removeChild(modalBg); };
    modalBg.addEventListener('click', (e) => { if (e.target === modalBg) fechar(); });

    const btnClose = modalBox.querySelector('#modal-close-del');
    if (btnClose) btnClose.onclick = fechar;
    const btnCancel = modalBox.querySelector('#modal-cancel-del');
    if (btnCancel) btnCancel.onclick = fechar;

    const btnConfirm = modalBox.querySelector('#modal-confirm-del');
    if (btnConfirm) {
      btnConfirm.onclick = async () => {
        await this.excluirLivro(livro);
        fechar();
      };
    }
  }



  /**
   * Abre modal para registrar uma nova anotação/citação com agilidade.
   *
   * @param {object} livro - Livro em foco.
   */
  abrirModalNovaAnotacao(livro) {
    if (!livro) return;

    const modalBg = document.createElement('div');
    modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';

    const modalBox = document.createElement('div');
    modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 440px; width: 100%; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 12px; font-family: var(--snoopy-font-sans);';

    const curPag = Number(livro.current_page) || '';
    const livroTitulo = livro.title || (livro.file ? livro.file.name : 'Livro');

    modalBox.innerHTML = `
      <div class="snoopy-card-header">
        <span class="snoopy-section-title">Captura Rápida de Anotação</span>
        <button id="modal-close-note" class="snoopy-modal-close" title="Fechar"></button>
      </div>
      <div style="font-size: 12px; color: #a1a1aa;">Livro: <strong>${livroTitulo}</strong></div>

      <div style="display: flex; gap: 8px;">
        <div style="flex: 1;">
          <div class="snoopy-modal-label">Destino:</div>
          <select id="modal-note-tipo" class="snoopy-form-select">
            <option value="licao">Citação / Lição Marcante</option>
            <option value="reflexao">Reflexão e Resumo Pessoal</option>
          </select>
        </div>
        <div style="width: 100px;">
          <div class="snoopy-modal-label">Página:</div>
          <input id="modal-note-page" class="snoopy-form-input" type="number" min="1" placeholder="Ex: 85" value="${curPag}">
        </div>
      </div>

      <div>
        <div class="snoopy-modal-label">Texto da Anotação / Citação:</div>
        <textarea id="modal-note-text" class="snoopy-form-input" style="height: 100px; resize: vertical; line-height: 1.4;" placeholder="Digite aqui o trecho marcante ou sua reflexão..."></textarea>
      </div>

      <div class="snoopy-toolbar" style="justify-content: flex-end; margin-top: 6px;">
        <button id="modal-cancel-note" class="snoopy-btn-action snoopy-btn-sm">Cancelar</button>
        <button id="modal-save-note" class="snoopy-btn-primary snoopy-btn-sm">Salvar na Nota</button>
      </div>
    `;

    modalBg.appendChild(modalBox);
    document.body.appendChild(modalBg);

    const fechar = () => { if (modalBg.parentNode) document.body.removeChild(modalBg); };
    modalBg.addEventListener('click', (e) => { if (e.target === modalBg) fechar(); });

    const btnClose = modalBox.querySelector('#modal-close-note');
    if (btnClose) btnClose.onclick = fechar;
    const btnCancel = modalBox.querySelector('#modal-cancel-note');
    if (btnCancel) btnCancel.onclick = fechar;

    const inputTexto = modalBox.querySelector('#modal-note-text');
    const inputPag = modalBox.querySelector('#modal-note-page');
    const selectTipo = modalBox.querySelector('#modal-note-tipo');
    const btnSave = modalBox.querySelector('#modal-save-note');

    if (btnSave) {
      btnSave.onclick = async () => {
        const texto = inputTexto ? inputTexto.value.trim() : '';
        const pagina = inputPag ? inputPag.value.trim() : '';
        const tipo = selectTipo ? selectTipo.value : 'licao';

        if (!texto) {
          this._notify('Digite o texto da anotação.');
          return;
        }

        await this.inserirAnotacao(livro, { tipo, texto, pagina });
        fechar();
      };
    }

    setTimeout(() => { if (inputTexto) inputTexto.focus(); }, 50);
  }

  /**
   * Abre modal para vincular uma matéria da pasta 03_Estudos ao livro em foco.
   *
   * @param {object} livro - Livro em foco.
   * @param {Array<object>} materias - Lista de matérias carregadas pelo Dataview.
   */
  abrirModalVincularEstudo(livro, materias = []) {
    if (!livro) return;

    const modalBg = document.createElement('div');
    modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';

    const modalBox = document.createElement('div');
    modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 440px; width: 100%; max-height: 80vh; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 12px; font-family: var(--snoopy-font-sans);';

    modalBox.innerHTML = `
      <div class="snoopy-card-header">
        <span class="snoopy-section-title">Vincular Matéria de Estudo</span>
        <button id="modal-close-vinc" class="snoopy-modal-close" title="Fechar"></button>
      </div>
      <div style="font-size: 12px; color: #a1a1aa;">Selecione uma matéria de <strong>03_Estudos/</strong>:</div>

      <input id="modal-vinc-search" class="snoopy-form-input" type="text" placeholder="Filtrar matéria...">

      <div id="modal-vinc-lista" style="max-height: 280px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding-right: 4px;"></div>
    `;

    modalBg.appendChild(modalBox);
    document.body.appendChild(modalBg);

    const fechar = () => { if (modalBg.parentNode) document.body.removeChild(modalBg); };
    modalBg.addEventListener('click', (e) => { if (e.target === modalBg) fechar(); });

    const btnClose = modalBox.querySelector('#modal-close-vinc');
    if (btnClose) btnClose.onclick = fechar;

    const containerLista = modalBox.querySelector('#modal-vinc-lista');
    const inputFiltro = modalBox.querySelector('#modal-vinc-search');

    const renderLista = (termo = '') => {
      containerLista.innerHTML = '';
      const filtradas = materias.filter(m => {
        const nome = m.title || (m.file ? m.file.name : '');
        return nome.toLowerCase().includes(termo.toLowerCase());
      });

      if (filtradas.length === 0) {
        containerLista.innerHTML = '<div class="snoopy-meta" style="text-align: center; padding: 20px 0;">Nenhuma matéria de estudo encontrada.</div>';
        return;
      }

      filtradas.forEach(mat => {
        const matNome = mat.title || (mat.file ? mat.file.name : 'Estudo');
        const matCategoria = mat.categoria || mat.area || 'Geral';
        const item = containerLista.createEl('div', {
          attr: {
            style: 'background: #181824; border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: background 0.12s ease;'
          }
        });

        item.innerHTML = `
          <div>
            <div style="font-size: 13px; font-weight: 700; color: #ffffff;">${matNome}</div>
            <div class="snoopy-meta" style="font-size: 11px;">${matCategoria}</div>
          </div>
          <button class="snoopy-btn-action snoopy-btn-sm">+ Vincular</button>
        `;

        item.onclick = async () => {
          await this.vincularEstudo(livro, matNome);
          fechar();
        };
      });
    };

    renderLista('');
    if (inputFiltro) {
      inputFiltro.oninput = (e) => renderLista(e.target.value.trim());
      setTimeout(() => inputFiltro.focus(), 50);
    }
  }

  /**
   * Abre o modal completo para atualizar páginas lidas, total e status de um livro.
   *
   * @param {object} livro - Objeto do livro no Dataview.
   */
  abrirModalProgresso(livro) {
    if (!livro) return;

    const modalBg = document.createElement('div');
    modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';

    const modalBox = document.createElement('div');
    modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 380px; width: 100%; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 12px; font-family: var(--snoopy-font-sans);';

    const curPag = Number(livro.current_page) || 0;
    const totPag = Number(livro.total_pages) || 100;
    const livroTitulo = livro.title || (livro.file ? livro.file.name : 'Livro');

    modalBox.innerHTML = `
      <div class="snoopy-card-header">
        <span class="snoopy-section-title">Atualizar Progresso</span>
        <button id="modal-close-prog" class="snoopy-modal-close" title="Fechar"></button>
      </div>
      <div style="font-size: 12px; color: #a1a1aa;">${livroTitulo}</div>

      <div style="display: flex; gap: 8px;">
        <div style="flex: 1;">
          <div class="snoopy-modal-label">Página Atual:</div>
          <input id="modal-prog-cur" class="snoopy-form-input" type="number" min="0" max="${totPag}" value="${curPag}">
        </div>
        <div style="flex: 1;">
          <div class="snoopy-modal-label">Total de Páginas:</div>
          <input id="modal-prog-tot" class="snoopy-form-input" type="number" min="1" value="${totPag}">
        </div>
      </div>

      <div>
        <div class="snoopy-modal-label">Status da Leitura:</div>
        <select id="modal-prog-status" class="snoopy-form-select">
          <option value="Lendo" ${livro.status === 'Lendo' ? 'selected' : ''}>Lendo</option>
          <option value="Quero ler" ${livro.status === 'Quero ler' ? 'selected' : ''}>Quero ler</option>
          <option value="Sintetizando" ${livro.status === 'Sintetizando' ? 'selected' : ''}>Sintetizando / Resumindo</option>
          <option value="Lido" ${livro.status === 'Lido' ? 'selected' : ''}>Lido (Concluído)</option>
          <option value="Pausado" ${livro.status === 'Pausado' ? 'selected' : ''}>Pausado</option>
        </select>
      </div>

      <div class="snoopy-toolbar" style="justify-content: flex-end; margin-top: 6px;">
        <button id="modal-cancel-prog" class="snoopy-btn-action snoopy-btn-sm">Cancelar</button>
        <button id="modal-save-prog" class="snoopy-btn-primary snoopy-btn-sm">Salvar Progresso</button>
      </div>
    `;

    modalBg.appendChild(modalBox);
    document.body.appendChild(modalBg);

    const fechar = () => { if (modalBg.parentNode) document.body.removeChild(modalBg); };
    modalBg.addEventListener('click', (e) => { if (e.target === modalBg) fechar(); });

    const btnClose = modalBox.querySelector('#modal-close-prog');
    if (btnClose) btnClose.onclick = fechar;
    const btnCancel = modalBox.querySelector('#modal-cancel-prog');
    if (btnCancel) btnCancel.onclick = fechar;

    const btnSave = modalBox.querySelector('#modal-save-prog');
    if (btnSave) {
      btnSave.onclick = async () => {
        const novoCur = parseInt(modalBox.querySelector('#modal-prog-cur').value, 10) || 0;
        const novoTot = parseInt(modalBox.querySelector('#modal-prog-tot').value, 10) || totPag;
        const novoStatus = modalBox.querySelector('#modal-prog-status').value;

        if (livro.file && livro.file.path) {
          const file = this.app.vault.getAbstractFileByPath(livro.file.path);
          if (file) {
            const raw = await this.app.vault.read(file);
            let updated = raw;

            if (/current_page:\s*\d+/.test(updated)) {
              updated = updated.replace(/current_page:\s*\d+/, `current_page: ${novoCur}`);
            } else if (updated.startsWith('---')) {
              updated = updated.replace(/^---\n/, `---\ncurrent_page: ${novoCur}\n`);
            }

            if (/total_pages:\s*\d+/.test(updated)) {
              updated = updated.replace(/total_pages:\s*\d+/, `total_pages: ${novoTot}`);
            }

            if (/status:\s*["'][^"']+["']/.test(updated)) {
              updated = updated.replace(/status:\s*["'][^"']+["']/, `status: "${novoStatus}"`);
            }

            if (novoCur >= novoTot && novoStatus !== 'Lido') {
              updated = updated.replace(/status:\s*["'][^"']+["']/, `status: "Lido"`);
            }

            await this.app.vault.modify(file, updated);
            const curOriginal = Number(livro.current_page) || 0;
            if (novoCur > curOriginal) {
              await this.registrarLeituraDiaria(novoCur - curOriginal);
            }
            this._notify(`Progresso atualizado: ${novoCur}/${novoTot} págs (${Math.round((novoCur / novoTot) * 100)}%)`);
            fechar();
            this.onReload();
          }
        }
      };
    }
  }

  /**
   * Abre modal para configurar a meta diária de páginas lidas.
   *
   * @param {number} metaAtual - Meta atual (padrão 25).
   * @param {Function} onSalvar - Callback com a nova meta.
   */
  abrirModalEditarMetaDiaria(metaAtual = 25, onSalvar = () => {}) {
    const modalBg = document.createElement('div');
    modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';

    const modalBox = document.createElement('div');
    modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 360px; width: 100%; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 12px; font-family: var(--snoopy-font-sans);';

    modalBox.innerHTML = `
      <div class="snoopy-card-header">
        <span class="snoopy-section-title">Definir Meta Diária</span>
        <button id="modal-close-meta" class="snoopy-modal-close" title="Fechar"></button>
      </div>

      <div class="snoopy-modal-label">Meta diária de leitura (páginas por dia):</div>
      <input id="modal-input-meta" class="snoopy-form-input" type="number" min="5" max="300" step="5" value="${metaAtual}">

      <div class="snoopy-meta" style="color: var(--text-muted); font-size: 11px;">
        Esta meta orienta o cálculo da sua Ofensiva (Streak) e a projeção de término de cada livro.
      </div>

      <div class="snoopy-toolbar" style="justify-content: flex-end; margin-top: 6px;">
        <button id="modal-cancel-meta" class="snoopy-btn-action snoopy-btn-sm">Cancelar</button>
        <button id="modal-save-meta" class="snoopy-btn-primary snoopy-btn-sm">Salvar Meta</button>
      </div>
    `;

    modalBg.appendChild(modalBox);
    document.body.appendChild(modalBg);

    const fechar = () => { if (modalBg.parentNode) document.body.removeChild(modalBg); };
    modalBg.addEventListener('click', (e) => { if (e.target === modalBg) fechar(); });

    const btnClose = modalBox.querySelector('#modal-close-meta');
    if (btnClose) btnClose.onclick = fechar;
    const btnCancel = modalBox.querySelector('#modal-cancel-meta');
    if (btnCancel) btnCancel.onclick = fechar;

    const inputMeta = modalBox.querySelector('#modal-input-meta');
    const btnSave = modalBox.querySelector('#modal-save-meta');

    if (btnSave) {
      btnSave.onclick = () => {
        const val = parseInt(inputMeta ? inputMeta.value : '25', 10) || 25;
        onSalvar(val);
        this._notify(`Meta diária definida para ${val} páginas!`);
        fechar();
      };
    }

    if (inputMeta) {
      inputMeta.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (btnSave) btnSave.click();
        }
      };
      setTimeout(() => inputMeta.focus(), 50);
    }
  }

  /**
   * Abre o modal de busca e importação na nuvem (Google Books API com fallback Open Library).
   *
   * @param {string} [termoInicial=''] - Termo pré-preenchido para busca imediata.
   */
  abrirModalBuscaNuvem(termoInicial = '') {
    const modalBg = document.createElement('div');
    modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';

    const modalBox = document.createElement('div');
    modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 680px; width: 100%; max-height: 85vh; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 12px; font-family: var(--snoopy-font-sans);';

    modalBox.innerHTML = `
      <div class="snoopy-card-header">
        <span class="snoopy-section-title">Buscar Livro na Nuvem</span>
        <button id="modal-close-search" class="snoopy-modal-close" title="Fechar"></button>
      </div>
      <div class="snoopy-modal-label">Digite o título, autor ou assunto (busca Google Books, Open Library e BrasilAPI):</div>

      <div class="snoopy-toolbar">
        <input id="modal-search-input" class="snoopy-form-input" type="text" placeholder="Ex: Hábitos Atômicos, Clean Architecture..." value="${termoInicial.replace(/"/g, '&quot;')}" style="flex: 1;">
        <button id="modal-search-btn" class="snoopy-btn-primary snoopy-btn-sm">Buscar</button>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
        <span class="snoopy-micro" style="color: #a1a1aa;">Possui o plugin oficial?</span>
        <button id="btn-trigger-book-search-plugin" class="snoopy-btn-action snoopy-btn-sm" style="font-size: 10.5px;">Usar Book Search Plugin (Nativo) ↗</button>
      </div>

      <div id="modal-search-results" style="max-height: 380px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; margin-top: 4px; padding-right: 4px;">
        <div class="snoopy-meta" style="text-align: center; padding: 20px 0;">Digite o termo e clique em "Buscar".</div>
      </div>
    `;

    modalBg.appendChild(modalBox);
    document.body.appendChild(modalBg);

    const fechar = () => { if (modalBg.parentNode) document.body.removeChild(modalBg); };
    modalBg.addEventListener('click', (e) => { if (e.target === modalBg) fechar(); });

    const btnClose = modalBox.querySelector('#modal-close-search');
    if (btnClose) btnClose.onclick = fechar;

    const btnPlugin = modalBox.querySelector('#btn-trigger-book-search-plugin');
    if (btnPlugin) {
      btnPlugin.onclick = () => {
        fechar();
        if (this.app && this.app.commands) {
          this.app.commands.executeCommandById('obsidian-book-search-plugin:open-book-search-modal');
        }
      };
    }

    const inputSearch = modalBox.querySelector('#modal-search-input');
    const btnSearch = modalBox.querySelector('#modal-search-btn');
    const resultsContainer = modalBox.querySelector('#modal-search-results');

    const executarBusca = async () => {
      const query = inputSearch ? inputSearch.value.trim() : '';
      if (!query) return;

      resultsContainer.innerHTML = '<div class="snoopy-meta" style="text-align: center; padding: 20px 0;">Consultando Google Books, Open Library e BrasilAPI...</div>';

      try {
        const livros = await ModaisLeituras.buscarLivrosCruzados(query);

        if (livros.length === 0) {
          resultsContainer.innerHTML = '<div class="snoopy-meta" style="color: #fca5a5; text-align: center; padding: 20px 0;">Nenhum livro encontrado para essa busca.</div>';
          return;
        }

        resultsContainer.innerHTML = '';
        livros.forEach(item => {
          const coverUrl = item.cover || 'https://images.pexels.com/photos/10254198/pexels-photo-10254198.jpeg';
          const itemCard = resultsContainer.createEl('div', {
            attr: {
              style: 'display: flex; gap: 12px; align-items: center; background: #181824; border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 10px; cursor: pointer; transition: background 0.12s ease;'
            }
          });

          itemCard.innerHTML = `
            <img src="${coverUrl}" style="width: 50px; height: 75px; border-radius: 4px; object-fit: cover; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.4);" />
            <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 3px;">
              <span style="font-size: 13.5px; font-weight: 700; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.title}</span>
              <span style="font-size: 11.5px; color: #a1a1aa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.author}</span>
              <div style="display: flex; gap: 6px; align-items: center; font-size: 10.5px; color: #71717a;">
                <span>${item.pages} págs</span>
                ${item.year ? `<span>• ${item.year}</span>` : ''}
                <span class="snoopy-micro" style="background: rgba(255,255,255,0.06); padding: 1px 5px; border-radius: 3px; color: var(--text-normal);">${item.category}</span>
              </div>
              ${item.description ? `<div style="font-size: 11px; color: var(--text-muted); line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${item.description}</div>` : ''}
            </div>
            <button class="snoopy-btn-primary snoopy-btn-sm" style="flex-shrink: 0; align-self: center;">Adicionar +</button>
          `;

          itemCard.addEventListener('click', async () => {
            const cleanTitle = item.title.replace(/[\\/:*?"<>|]/g, '-').trim();
            const targetPath = `04_Leituras/Livros/${cleanTitle}.md`;

            if (!this.app.vault.getAbstractFileByPath("04_Leituras/Livros")) {
              await this.app.vault.createFolder("04_Leituras/Livros").catch(() => {});
            }

            const tplFile = this.app.vault.getAbstractFileByPath("99_Meta/Templates/Template - Livro.md");
            let content = "";
            const sinopseTexto = item.description || `Livro cadastrado automaticamente via busca na nuvem.`;

            if (tplFile) {
              const raw = await this.app.vault.read(tplFile);
              content = raw.replace(/{{title}}/g, cleanTitle)
                           .replace(/{{author}}/g, item.author)
                           .replace(/{{category}}/g, item.category)
                           .replace(/{{publisher}}/g, item.publisher)
                           .replace(/{{publishDate}}/g, String(item.year))
                           .replace(/{{totalPage}}/g, String(item.pages))
                           .replace(/{{coverUrl}}/g, coverUrl)
                           .replace(/{{description}}/g, sinopseTexto.replace(/[\n\r]+/g, ' '));
            } else {
              content = `---\ntitle: "${cleanTitle}"\nauthor: "${item.author}"\ncategory: "${item.category}"\ntotal_pages: ${item.pages}\ncurrent_page: 0\nstatus: "Quero ler"\nrating: 0\ncover: "${coverUrl}"\ndescription: "${sinopseTexto.replace(/[\n\r]+/g, ' ')}"\nestudos_vinculados: []\ntags: [leitura, livro]\n---\n\n# ${cleanTitle}\n\n## 📌 Sinopse & Visão Geral\n${sinopseTexto}\n\n## 🔗 Estudos & Disciplinas Vinculadas\n- \n\n## 💡 Principais Lições & Citações\n- \n\n## 🧠 Minhas Reflexões & Resumo\n- \n`;
            }

            const newFile = await this.app.vault.create(targetPath, content);
            this._notify(`Livro "${cleanTitle}" adicionado à estante!`);
            fechar();
            this.onSelectLivro(newFile.path);
            this.onReload();
          });
        });

      } catch (err) {
        resultsContainer.innerHTML = `<div class="snoopy-meta" style="color: #fca5a5; text-align: center; padding: 20px 0;">Erro ao consultar nuvem: ${err.message || 'Verifique a conexão'}.</div>`;
      }
    };

    if (btnSearch) btnSearch.onclick = executarBusca;
    if (inputSearch) {
      inputSearch.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          executarBusca();
        }
      };
      setTimeout(() => inputSearch.focus(), 50);
    }

    if (termoInicial) {
      setTimeout(() => executarBusca(), 60);
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ModaisLeituras;
}

return ModaisLeituras;

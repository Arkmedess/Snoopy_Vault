/**
 * Snoopy Vault - Microsserviço de Gestão e Renderização de Templates de Tarefas
 * Fornece validação, interpolação de variáveis, persistência de templates JSON
 * e orquestração de vínculos com Estudos, Bookshelf, Kanban e Pomodoro.
 *
 * @module core/task_templates
 */
const TaskTemplates = {
  /**
   * Retorna os templates padrão do sistema pré-configurados.
   *
   * @returns {Array<object>} Lista de templates padrão do Snoopy.
   */
  obterTemplatesPadrao() {
    return [
      {
        id: 'estudo-ingles',
        nome: 'Estudo de Inglês / Idiomas',
        tipo: 'estudo',
        pasta: '03_Estudos',
        icone: 'brain',
        frontmatter: {
          area: 'Idiomas',
          status: 'Em Andamento',
          priority: 'Alta',
          minutos_foco: 0,
          questoes_feitas: 0,
          questoes_acertos: 0,
          tags: ['estudo', 'ingles']
        },
        corpo: '# {{title}}\n\n> **Área:** `Idiomas` | **Status:** `Em Andamento`\n\n---\n\n## 🎯 Metas da Sessão\n- [ ] Prática de Listening e Compreensão 🎧\n- [ ] Absorção de Vocabulário e Flashcards 🧠\n- [ ] Exercícios Práticos e Diálogos 📝\n\n---\n\n## 📖 Anotações & Vocabulário Novo\n\n\n---\n\n[[00_Home/Home|← Voltar ao Painel]]\n',
        vinculos: {
          kanban: { status: 'Em Andamento', prioridade: 'Alta' },
          estudos: { adicionar_ao_ciclo: true, revisao_espacada: true, intervalo_dias: 1 },
          pomodoro: { tempo_foco: 25, tempo_pausa: 5, auto_apontar: true }
        }
      },
      {
        id: 'leitura-livro',
        nome: 'Leitura de Livro (Bookshelf)',
        tipo: 'leitura',
        pasta: '04_Leituras/Livros',
        icone: 'book-open',
        frontmatter: {
          author: 'Autor',
          category: 'Literatura',
          total_pages: 300,
          current_page: 0,
          status: 'Lendo',
          priority: 'Média',
          rating: 0,
          cover: '',
          tags: ['leitura', 'livro']
        },
        corpo: '# {{title}}\n\n> **Status:** `Lendo` | **Páginas:** {{current_page}}/{{total_pages}}\n\n---\n\n## 📌 Visão Geral & Sinopse\n\n\n---\n\n## 💡 Principais Lições & Citações\n- \n\n---\n\n## 🧠 Reflexões\n- \n\n---\n\n[[00_Home/Home|← Voltar ao Painel]]\n',
        vinculos: {
          kanban: { status: 'Em Andamento', prioridade: 'Média' },
          bookshelf: { vincular_leitura: true },
          pomodoro: { tempo_foco: 30, tempo_pausa: 5, auto_apontar: true }
        }
      },
      {
        id: 'projeto-sprint',
        nome: 'Projeto / Iniciativa Técnica',
        tipo: 'projeto',
        pasta: '02_Projetos',
        icone: 'code-2',
        frontmatter: {
          status: 'Em Andamento',
          priority: 'Alta',
          start_date: '{{date}}',
          tags: ['projeto']
        },
        corpo: '# 🎯 {{title}}\n\n> **Status:** `Em Andamento` | **Início:** {{date}}\n\n---\n\n## 🧭 Objetivo & Critérios de Sucesso\n- \n\n---\n\n## 📋 Entregas & Tarefas\n- [ ] Planejamento inicial da arquitetura 📅 {{date}} ⏫\n- [ ] Implementação do MVP funcional 📅 {{date}} 🔼\n- [ ] Validação e testes automatizados 📅 {{date}} 🔼\n\n---\n\n[[00_Home/Home|← Voltar ao Painel]]\n',
        vinculos: {
          kanban: { status: 'Em Andamento', prioridade: 'Alta' },
          pomodoro: { tempo_foco: 50, tempo_pausa: 10, auto_apontar: true }
        }
      }
    ];
  },

  /**
   * Garante a criação da pasta de templates e grava os templates padrão caso ausentes.
   *
   * @param {object} app - Instância do Obsidian App.
   * @returns {Promise<void>}
   */
  async garantirTemplatesBase(app) {
    if (!app || !app.vault) return;
    const pastaTemplates = '99_Meta/Templates/Tarefas';
    
    if (!app.vault.getAbstractFileByPath(pastaTemplates)) {
      if (typeof app.vault.createFolder === 'function') {
        await app.vault.createFolder(pastaTemplates).catch(() => {});
      }
    }

    const padroes = this.obterTemplatesPadrao();
    for (const tpl of padroes) {
      const filePath = `${pastaTemplates}/${tpl.id}.json`;
      if (!app.vault.getAbstractFileByPath(filePath)) {
        await app.vault.create(filePath, JSON.stringify(tpl, null, 2)).catch(() => {});
      }
    }
  },

  /**
   * Carrega e analisa todos os templates existentes no diretório do vault.
   *
   * @param {object} app - Instância do Obsidian App.
   * @returns {Promise<Array<object>>} Lista de templates carregados e válidos.
   */
  async listarTemplates(app) {
    await this.garantirTemplatesBase(app);
    const pastaTemplates = '99_Meta/Templates/Tarefas';
    const templates = [];

    const abstractFolder = app.vault.getAbstractFileByPath(pastaTemplates);
    if (abstractFolder && Array.isArray(abstractFolder.children)) {
      for (const child of abstractFolder.children) {
        if (child.name.endsWith('.json')) {
          try {
            const raw = await app.vault.read(child);
            const parsed = JSON.parse(raw);
            if (this.validar(parsed).valido) {
              templates.push(parsed);
            }
          } catch(e) {
            console.warn(`[TaskTemplates] Erro ao carregar template ${child.name}:`, e);
          }
        }
      }
    }

    // Se a listagem não retornou nada, garante os padrões em memória
    return templates.length > 0 ? templates : this.obterTemplatesPadrao();
  },

  /**
   * Salva um template novo ou modificado em disco.
   *
   * @param {object} app - Instância do Obsidian App.
   * @param {object} templateObj - Estrutura do template a persistir.
   * @returns {Promise<{ sucesso: boolean, caminho: string }>}
   */
  async salvarTemplate(app, templateObj) {
    const validacao = this.validar(templateObj);
    if (!validacao.valido) {
      throw new Error(`Template inválido: ${validacao.erros.join(', ')}`);
    }

    const id = templateObj.id || templateObj.nome.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    templateObj.id = id;
    const caminho = `99_Meta/Templates/Tarefas/${id}.json`;
    const jsonStr = JSON.stringify(templateObj, null, 2);

    const existente = app.vault.getAbstractFileByPath(caminho);
    if (existente) {
      await app.vault.modify(existente, jsonStr);
    } else {
      await app.vault.create(caminho, jsonStr);
    }

    return { sucesso: true, caminho };
  },

  /**
   * Valida se a estrutura do template possui os campos mínimos requeridos.
   *
   * @param {object} template - Objeto de definição do template.
   * @returns {{ valido: boolean, erros: string[] }} Resultado da validação estrutural.
   */
  validar(template) {
    const erros = [];
    if (!template || typeof template !== 'object') {
      return { valido: false, erros: ['Template inválido ou não fornecido.'] };
    }

    if (!template.nome || typeof template.nome !== 'string' || !template.nome.trim()) {
      erros.push('O campo "nome" é obrigatório.');
    }
    if (!template.tipo || typeof template.tipo !== 'string') {
      erros.push('O campo "tipo" é obrigatório.');
    }
    if (!template.pasta || typeof template.pasta !== 'string' || !template.pasta.trim()) {
      erros.push('O campo "pasta" é obrigatório.');
    }

    return {
      valido: erros.length === 0,
      erros
    };
  },

  /**
   * Converte um objeto JavaScript em cabeçalho YAML frontmatter válido.
   *
   * @private
   * @param {object} frontmatterObj - Objeto com os metadados.
   * @returns {string} Bloco YAML delimitado por ---.
   */
  _gerarYamlFrontmatter(frontmatterObj) {
    if (!frontmatterObj || typeof frontmatterObj !== 'object') return '';
    const linhas = ['---'];

    for (const [chave, valor] of Object.entries(frontmatterObj)) {
      if (valor === undefined || valor === null) {
        linhas.push(`${chave}: `);
      } else if (typeof valor === 'string') {
        linhas.push(`${chave}: "${valor.replace(/"/g, '\\"')}"`);
      } else if (typeof valor === 'number' || typeof valor === 'boolean') {
        linhas.push(`${chave}: ${valor}`);
      } else if (Array.isArray(valor)) {
        if (valor.length === 0) {
          linhas.push(`${chave}: []`);
        } else {
          linhas.push(`${chave}:`);
          valor.forEach(item => {
            linhas.push(`  - "${String(item).replace(/"/g, '\\"')}"`);
          });
        }
      } else if (typeof valor === 'object') {
        linhas.push(`${chave}: ${JSON.stringify(valor)}`);
      }
    }

    linhas.push('---');
    return linhas.join('\n');
  },

  /**
   * Interpola marcadores {{variavel}} dentro de um texto.
   *
   * @private
   * @param {string} texto - Texto com possíveis marcadores.
   * @param {object} variaveis - Dicionário de substituição.
   * @returns {string} Texto com variáveis aplicadas.
   */
  _substituirVariaveis(texto, variaveis) {
    if (!texto || typeof texto !== 'string') return '';
    return texto.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (match, chave) => {
      return variaveis[chave] !== undefined && variaveis[chave] !== null
        ? String(variaveis[chave])
        : match;
    });
  },

  /**
   * Interpola variáveis e gera o conteúdo Markdown completo da nota.
   *
   * @param {object} template - Estrutura do template.
   * @param {object} [variaveis={}] - Parâmetros fornecidos para a criação da nota.
   * @returns {{ frontmatter: object, conteudoMarkdown: string, caminhoSugerido: string }}
   */
  renderizar(template, variaveis = {}) {
    const validacao = this.validar(template);
    if (!validacao.valido) {
      throw new Error(`Template inválido: ${validacao.erros.join(', ')}`);
    }

    const titulo = variaveis.title || variaveis.titulo || template.nome;
    const mapaVars = {
      title: titulo,
      titulo: titulo,
      date: variaveis.date || variaveis.data || new Date().toISOString().slice(0, 10),
      status: variaveis.status || 'Ativo',
      ...variaveis
    };

    const fmProcessado = {
      title: titulo,
      ...(template.frontmatter || {})
    };

    for (const [k, v] of Object.entries(fmProcessado)) {
      if (typeof v === 'string') {
        fmProcessado[k] = this._substituirVariaveis(v, mapaVars);
      }
    }

    const yamlStr = this._gerarYamlFrontmatter(fmProcessado);
    const corpoProcessado = this._substituirVariaveis(template.corpo || '', mapaVars);
    const conteudoMarkdown = `${yamlStr}\n\n${corpoProcessado}`.trim() + '\n';
    const caminhoSugerido = `${template.pasta.replace(/\/+$/, '')}/${titulo}.md`;

    return {
      frontmatter: fmProcessado,
      conteudoMarkdown,
      caminhoSugerido
    };
  },

  /**
   * Extrai e normaliza os vínculos de módulos do template.
   *
   * @param {object} template - Estrutura do template.
   * @returns {{ kanban: object, estudos: object, pomodoro: object, bookshelf: object }}
   */
  extrairVinculos(template) {
    const vinculos = (template && template.vinculos) || {};
    return {
      kanban: {
        status: vinculos.kanban?.status || 'Em Andamento',
        prioridade: vinculos.kanban?.prioridade || 'Média',
        ativo: Boolean(vinculos.kanban)
      },
      estudos: {
        adicionar_ao_ciclo: Boolean(vinculos.estudos?.adicionar_ao_ciclo),
        revisao_espacada: Boolean(vinculos.estudos?.revisao_espacada),
        intervalo_dias: Number(vinculos.estudos?.intervalo_dias) || 1,
        ativo: Boolean(vinculos.estudos)
      },
      pomodoro: {
        tempo_foco: Number(vinculos.pomodoro?.tempo_foco) || 25,
        tempo_pausa: Number(vinculos.pomodoro?.tempo_pausa) || 5,
        auto_apontar: Boolean(vinculos.pomodoro?.auto_apontar),
        ativo: Boolean(vinculos.pomodoro)
      },
      bookshelf: {
        vincular_leitura: Boolean(vinculos.bookshelf?.vincular_leitura),
        ativo: Boolean(vinculos.bookshelf)
      }
    };
  },

  /**
   * Executa a orquestração completa: cria a nota, atualiza o ciclo de estudos e
   * dispara o direcionamento do Pomodoro via eventos.
   *
   * @param {object} app - Instância do Obsidian App.
   * @param {object} template - Estrutura do template selecionado.
   * @param {object} dados - Parâmetros da criação (title, date, etc.).
   * @param {object} [events] - Barramento reativo de eventos da dashboard.
   * @returns {Promise<{ notaPath: string, tarefaTexto: string }>}
   */
  async executarCriacao(app, template, dados, events) {
    const { conteudoMarkdown, caminhoSugerido } = this.renderizar(template, dados);
    const vinculos = this.extrairVinculos(template);
    const titulo = dados.title || dados.titulo || template.nome;
    const dataISO = dados.date || dados.data || new Date().toISOString().slice(0, 10);

    // 1. Cria a nota no Vault
    const pasta = template.pasta.replace(/\/+$/, '');
    if (!app.vault.getAbstractFileByPath(pasta)) {
      if (typeof app.vault.createFolder === 'function') {
        await app.vault.createFolder(pasta).catch(() => {});
      }
    }

    const arquivoExistente = app.vault.getAbstractFileByPath(caminhoSugerido);
    if (arquivoExistente) {
      await app.vault.modify(arquivoExistente, conteudoMarkdown);
    } else {
      await app.vault.create(caminhoSugerido, conteudoMarkdown);
    }

    // 2. Vínculo com Estudos (ciclo-estudos.json)
    if (vinculos.estudos.ativo && (vinculos.estudos.adicionar_ao_ciclo || vinculos.estudos.revisao_espacada)) {
      const cicloPath = '99_Meta/ciclo-estudos.json';
      let cicloData = { disciplinaAtualIdx: 0, cicloOrdem: [], revisoes: [] };

      const cicloFile = app.vault.getAbstractFileByPath(cicloPath);
      if (cicloFile) {
        try {
          const raw = await app.vault.read(cicloFile);
          cicloData = JSON.parse(raw);
          if (!Array.isArray(cicloData.cicloOrdem)) cicloData.cicloOrdem = [];
          if (!Array.isArray(cicloData.revisoes)) cicloData.revisoes = [];
        } catch(e) {}
      }

      if (vinculos.estudos.adicionar_ao_ciclo && !cicloData.cicloOrdem.includes(caminhoSugerido)) {
        cicloData.cicloOrdem.push(caminhoSugerido);
      }

      if (vinculos.estudos.revisao_espacada) {
        const jaExisteRevisao = cicloData.revisoes.some(r => r.materiaPath === caminhoSugerido);
        if (!jaExisteRevisao) {
          cicloData.revisoes.push({
            materiaPath: caminhoSugerido,
            nome: titulo,
            ultimaRevisao: dataISO,
            proximaRevisao: dataISO,
            intervaloDias: vinculos.estudos.intervalo_dias,
            tipo: 'Teoria + Questões',
            status: 'programada'
          });
        }
      }

      const cicloNovoStr = JSON.stringify(cicloData, null, 2);
      if (cicloFile) {
        await app.vault.modify(cicloFile, cicloNovoStr);
      } else {
        await app.vault.create(cicloPath, cicloNovoStr);
      }
    }

    // 3. Vínculo com Pomodoro
    if (vinculos.pomodoro.ativo && vinculos.pomodoro.auto_apontar) {
      const payloadFoco = {
        texto: titulo,
        caminho: caminhoSugerido,
        tempo_foco: vinculos.pomodoro.tempo_foco,
        tempo_pausa: vinculos.pomodoro.tempo_pausa
      };

      if (events && typeof events.emit === 'function') {
        events.emit('pomodoro:foco', payloadFoco);
      } else if (typeof window !== 'undefined' && typeof window.snoopySetPomodoroFocus === 'function') {
        window.snoopySetPomodoroFocus(titulo);
      }
    }

    // 4. Formata a representação em linha de tarefa com link para a nota e meta/progresso
    const metaQtd = dados.meta_qtd || template.meta_qtd;
    const unidadeMedida = dados.unidade_medida || template.unidade_medida || (template.tipo === 'leitura' ? 'págs' : template.tipo === 'estudo' ? 'min' : '');
    const progFeito = dados.progresso_feito;

    let progStr = '';
    if (metaQtd) {
      if (progFeito !== undefined && progFeito !== null && progFeito !== '') {
        progStr = ` [${progFeito}/${metaQtd} ${unidadeMedida}]`;
      } else {
        progStr = ` [${metaQtd}${unidadeMedida}]`;
      }
    }

    const prioChar = vinculos.kanban.prioridade === 'Alta' ? ' ⏫' : vinculos.kanban.prioridade === 'Baixa' ? ' 🔽' : ' 🔼';
    const tarefaTexto = `- [ ] [[${caminhoSugerido}|${titulo}]]${progStr} 📅 ${dataISO}${prioChar}`;

    return {
      notaPath: caminhoSugerido,
      tarefaTexto
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TaskTemplates;
}

return TaskTemplates;

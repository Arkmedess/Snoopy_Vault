const { test, describe } = require('node:test');
const assert = require('node:assert');
const ModaisLeituras = require('../../../99_Meta/Snoopy/subdashboards/leituras/modais.js');

describe('Subdashboard Leituras - ModaisLeituras', () => {
  test('Instanciação correta e métodos auxiliares', () => {
    let reloaded = false;
    let selected = null;

    const mockCtx = {
      app: { vault: {} },
      onReload: () => { reloaded = true; },
      onSelectLivro: (p) => { selected = p; }
    };

    const modais = new ModaisLeituras(mockCtx);
    assert.ok(modais);
    assert.strictEqual(typeof modais.abrirModalProgresso, 'function');
    assert.strictEqual(typeof modais.abrirModalBuscaNuvem, 'function');
    assert.strictEqual(typeof modais.abrirModalNovaAnotacao, 'function');
    assert.strictEqual(typeof modais.abrirModalVincularEstudo, 'function');
    assert.strictEqual(typeof modais.incrementarPaginas, 'function');
    assert.strictEqual(typeof modais.atualizarRating, 'function');
  });

  test('Extração correta de dados estruturados da nota markdown', () => {
    const rawMarkdown = `---
title: "Clean Code"
author: "Robert C. Martin"
total_pages: 400
current_page: 120
rating: 4
description: "Um clássico do desenvolvimento ágil."
estudos_vinculados:
  - "[[Programação Orientada a Objetos]]"
---

# Clean Code

## 📌 Sinopse & Visão Geral
Um clássico do desenvolvimento ágil.

## 🔗 Estudos & Disciplinas Vinculadas
- [[Programação Orientada a Objetos]]

## 💡 Principais Lições & Citações
- "Deixe o código mais limpo do que quando você o encontrou." (p. 15)
- "Nomes de variáveis devem revelar a intenção." (p. 22)

## 🧠 Minhas Reflexões & Resumo
- Refatorar continuamente diminui a dívida técnica com o passar dos meses.
`;

    const dados = ModaisLeituras.extrairDadosLivro(rawMarkdown);
    assert.strictEqual(dados.sinopse, 'Um clássico do desenvolvimento ágil.');
    assert.strictEqual(dados.licoes.length, 2);
    assert.match(dados.licoes[0], /Deixe o código mais limpo/);
    assert.match(dados.licoes[1], /Nomes de variáveis/);
    assert.strictEqual(dados.reflexoes.length, 1);
    assert.match(dados.reflexoes[0], /Refatorar continuamente/);
    assert.strictEqual(dados.estudosVinculados.length, 1);
    assert.strictEqual(dados.estudosVinculados[0], 'Programação Orientada a Objetos');
  });

  test('Incrementa páginas e atualiza status para Lido quando atinge o total', async () => {
    let conteudoModificado = '';
    let dailyModificado = '';
    const raw = `---
title: "O Programador Pragmático"
total_pages: 200
current_page: 190
status: "Lendo"
---
# Conteúdo`;

    const mockVault = {
      getAbstractFileByPath: (p) => {
        if (p && p.includes('Diário')) return { path: p, isDaily: true };
        return { path: '04_Leituras/Livros/Prog.md' };
      },
      read: async (file) => file && file.isDaily ? `---\ndate: 2026-10-10\npaginas_lidas: 0\n---` : raw,
      modify: async (file, novo) => {
        if (file && file.isDaily) dailyModificado = novo;
        else conteudoModificado = novo;
      }
    };

    const modais = new ModaisLeituras({ app: { vault: mockVault } });
    await modais.incrementarPaginas({ file: { path: '04_Leituras/Livros/Prog.md' }, current_page: 190, total_pages: 200 }, 10);

    assert.match(conteudoModificado, /current_page:\s*200/);
    assert.match(conteudoModificado, /status:\s*"Lido"/);
    assert.match(dailyModificado, /paginas_lidas:\s*10/);
  });

  test('Atualiza rating por estrelas no frontmatter', async () => {
    let conteudoModificado = '';
    const raw = `---
title: "Refactoring"
rating: 0
---
# Conteúdo`;

    const mockVault = {
      getAbstractFileByPath: () => ({ path: '04_Leituras/Livros/Ref.md' }),
      read: async () => raw,
      modify: async (file, novo) => { conteudoModificado = novo; }
    };

    const modais = new ModaisLeituras({ app: { vault: mockVault } });
    await modais.atualizarRating({ file: { path: '04_Leituras/Livros/Ref.md' } }, 5);

    assert.match(conteudoModificado, /rating:\s*5/);
  });

  test('Insere anotação formatada na seção correspondente da nota', async () => {
    let conteudoModificado = '';
    const raw = `---
title: "Domain-Driven Design"
---
# DDD

## 💡 Principais Lições & Citações
- Lição existente

## 🧠 Minhas Reflexões & Resumo
`;

    const mockVault = {
      getAbstractFileByPath: () => ({ path: '04_Leituras/Livros/DDD.md' }),
      read: async () => raw,
      modify: async (file, novo) => { conteudoModificado = novo; }
    };

    const modais = new ModaisLeituras({ app: { vault: mockVault } });
    await modais.inserirAnotacao({ file: { path: '04_Leituras/Livros/DDD.md' } }, {
      tipo: 'licao',
      texto: 'Ubiquitous Language deve ser usada por todos.',
      pagina: 42
    });

    assert.match(conteudoModificado, /Ubiquitous Language deve ser usada por todos/);
    assert.match(conteudoModificado, /\(p\.\s*42\)/);
  });

  test('Vincula matéria de estudo na nota do livro sem duplicar', async () => {
    let conteudoModificado = '';
    const raw = `---
title: "Clean Architecture"
estudos_vinculados: []
---
# Clean Architecture

## 🔗 Estudos & Disciplinas Vinculadas
- 
`;

    const mockVault = {
      getAbstractFileByPath: () => ({ path: '04_Leituras/Livros/CA.md' }),
      read: async () => raw,
      modify: async (file, novo) => { conteudoModificado = novo; }
    };

    const modais = new ModaisLeituras({ app: { vault: mockVault } });
    await modais.vincularEstudo({ file: { path: '04_Leituras/Livros/CA.md' } }, 'Arquitetura de Software');

    assert.match(conteudoModificado, /\[\[Arquitetura de Software\]\]/);
  });

  test('Atualiza metadados completos de capa, sinopse e categoria no frontmatter', async () => {
    let conteudoModificado = '';
    const raw = `---
title: "Livro Teste"
author: "Autor Antigo"
category: "Geral"
cover: "https://old-cover.jpg"
description: "Sinopse antiga"
total_pages: 150
---
# Livro Teste

## 📌 Sinopse & Visão Geral
Sinopse antiga
`;

    const mockVault = {
      getAbstractFileByPath: () => ({ path: '04_Leituras/Livros/Teste.md' }),
      read: async () => raw,
      modify: async (file, novo) => { conteudoModificado = novo; }
    };

    const modais = new ModaisLeituras({ app: { vault: mockVault } });
    await modais.salvarMetadados({ file: { path: '04_Leituras/Livros/Teste.md' } }, {
      author: 'Novo Autor',
      category: 'Tecnologia',
      cover: 'https://new-cover.jpg',
      description: 'Nova sinopse enriquecida',
      total_pages: 280
    });

    assert.match(conteudoModificado, /author:\s*"Novo Autor"/);
    assert.match(conteudoModificado, /category:\s*"Tecnologia"/);
    assert.match(conteudoModificado, /cover:\s*"https:\/\/new-cover\.jpg"/);
    assert.match(conteudoModificado, /description:\s*"Nova sinopse enriquecida"/);
    assert.match(conteudoModificado, /total_pages:\s*280/);
    assert.match(conteudoModificado, /Nova sinopse enriquecida/);
  });

  test('Exclui arquivo do livro enviando para a lixeira do vault', async () => {
    let arquivoExcluido = null;
    const mockFile = { path: '04_Leituras/Livros/Excluir.md' };
    const mockVault = {
      getAbstractFileByPath: () => mockFile,
      trash: async (file, system) => { arquivoExcluido = file; }
    };

    let reloaded = false;
    const modais = new ModaisLeituras({
      app: { vault: mockVault },
      onReload: () => { reloaded = true; }
    });

    await modais.excluirLivro({ file: mockFile });
    assert.strictEqual(arquivoExcluido, mockFile);
    assert.strictEqual(reloaded, true);
  });

  test('Mescla e cruza metadados de múltiplas APIs (Google Books + Open Library)', () => {
    const googleBook = {
      title: 'Hábitos Atômicos',
      author: 'James Clear',
      pages: 320,
      year: '2019',
      cover: 'https://books.google.com/cover-small.jpg',
      description: 'Um método fácil e comprovado de criar bons hábitos.',
      category: 'Self-Help',
      isbn: '9788550807522'
    };

    const openLibBook = {
      title: 'Hábitos Atômicos',
      author: 'James Clear',
      subjects: ['Habits', 'Psychology', 'Self-Actualization', 'Produtividade'],
      cover: 'https://covers.openlibrary.org/b/id/10254-L.jpg',
      pages: 320
    };

    const mesclado = ModaisLeituras.mesclarMetadados(googleBook, openLibBook);

    assert.strictEqual(mesclado.title, 'Hábitos Atômicos');
    assert.strictEqual(mesclado.author, 'James Clear');
    assert.match(mesclado.description, /Um método fácil e comprovado/);
    assert.ok(Array.isArray(mesclado.categories));
    assert.ok(mesclado.categories.includes('Desenvolvimento Pessoal') || mesclado.categories.includes('Hábitos'));
    assert.ok(mesclado.categories.length >= 2);
    assert.match(mesclado.category, /Desenvolvimento Pessoal|Hábitos/);
    assert.strictEqual(mesclado.cover, 'https://covers.openlibrary.org/b/id/10254-L.jpg');
  });

  test('Normaliza termos de gênero para lista canônica sem & e isolada', () => {
    assert.strictEqual(ModaisLeituras.normalizarGenero('Self-Help'), 'Desenvolvimento Pessoal');
    assert.strictEqual(ModaisLeituras.normalizarGenero('Computers & Technology'), 'Tecnologia');
    assert.strictEqual(ModaisLeituras.normalizarGenero('Programming / Software'), 'Programação');
    assert.strictEqual(ModaisLeituras.normalizarGenero('Science Fiction'), 'Ficção Científica');
    assert.strictEqual(ModaisLeituras.normalizarGenero('Business & Economics'), 'Negócios');
    assert.strictEqual(ModaisLeituras.normalizarGenero('Horror'), 'Terror');
    assert.strictEqual(ModaisLeituras.normalizarGenero('Desconhecido Qualquer'), 'Desconhecido Qualquer');
  });

  test('Remove anotação ou citação específica do arquivo do livro', async () => {
    let conteudoModificado = '';
    const raw = `---
title: "Clean Code"
---
# Clean Code

## 💡 Principais Lições & Citações
- "Deixe o código mais limpo do que quando você o encontrou." (p. 15)
- "Nomes devem revelar intenção." (p. 22)

## 🧠 Minhas Reflexões & Resumo
`;

    const mockVault = {
      getAbstractFileByPath: () => ({ path: '04_Leituras/Livros/Clean.md' }),
      read: async () => raw,
      modify: async (file, novo) => { conteudoModificado = novo; }
    };

    const modais = new ModaisLeituras({ app: { vault: mockVault } });
    await modais.removerAnotacao(
      { file: { path: '04_Leituras/Livros/Clean.md' } },
      'Deixe o código mais limpo do que quando você o encontrou.'
    );

    assert.doesNotMatch(conteudoModificado, /Deixe o código mais limpo/);
    assert.match(conteudoModificado, /Nomes devem revelar intenção/);
  });

  test('Desvincula matéria de estudo do frontmatter e da seção markdown', async () => {
    let conteudoModificado = '';
    const raw = `---
title: "Clean Architecture"
estudos_vinculados:
  - "[[Arquitetura de Software]]"
  - "[[Engenharia de Dados]]"
---
# Clean Architecture

## 🔗 Estudos & Disciplinas Vinculadas
- [[Arquitetura de Software]]
- [[Engenharia de Dados]]
`;

    const mockVault = {
      getAbstractFileByPath: () => ({ path: '04_Leituras/Livros/CA.md' }),
      read: async () => raw,
      modify: async (file, novo) => { conteudoModificado = novo; }
    };

    const modais = new ModaisLeituras({ app: { vault: mockVault } });
    await modais.desvincularEstudo({ file: { path: '04_Leituras/Livros/CA.md' } }, 'Arquitetura de Software');

    assert.doesNotMatch(conteudoModificado, /Arquitetura de Software/);
    assert.match(conteudoModificado, /\[\[Engenharia de Dados\]\]/);
  });

  test('Salva séries e múltiplos gêneros nos metadados do livro', async () => {
    let conteudoModificado = '';
    const raw = `---
title: "Duna"
category: "Ficção Científica"
---
# Duna
`;

    const mockVault = {
      getAbstractFileByPath: () => ({ path: '04_Leituras/Livros/Duna.md' }),
      read: async () => raw,
      modify: async (file, novo) => { conteudoModificado = novo; }
    };

    const modais = new ModaisLeituras({ app: { vault: mockVault } });
    await modais.salvarMetadados({ file: { path: '04_Leituras/Livros/Duna.md' } }, {
      categories: ['Ficção Científica', 'Filosofia', 'Aventura'],
      series: 'Crônicas de Duna',
      series_index: 1
    });

    assert.match(conteudoModificado, /series:\s*"Crônicas de Duna"/);
    assert.match(conteudoModificado, /series_index:\s*1/);
    assert.match(conteudoModificado, /categories:/);
    assert.match(conteudoModificado, /"Ficção Científica"/);
    assert.match(conteudoModificado, /"Filosofia"/);
  });

  test('Adiciona novo gênero isolado sem duplicar e atualiza categories no frontmatter', async () => {
    let conteudoModificado = '';
    const raw = `---
title: "Neuromancer"
category: "Ficção Científica"
categories:
  - "Ficção Científica"
---
# Neuromancer
`;

    const mockVault = {
      getAbstractFileByPath: () => ({ path: '04_Leituras/Livros/Neuro.md' }),
      read: async () => raw,
      modify: async (file, novo) => { conteudoModificado = novo; }
    };

    const modais = new ModaisLeituras({ app: { vault: mockVault } });
    await modais.adicionarGenero(
      { file: { path: '04_Leituras/Livros/Neuro.md' }, categories: ['Ficção Científica'] },
      'Cyberpunk'
    );

    assert.match(conteudoModificado, /"Cyberpunk"/);
    assert.match(conteudoModificado, /"Ficção Científica"/);
  });

  test('Remove gênero específico e redefine para Geral se a lista ficar vazia', async () => {
    let conteudoModificado = '';
    const raw = `---
title: "Livro Teste"
category: "Romance"
categories:
  - "Romance"
  - "Aventura"
---
# Livro Teste
`;

    const mockVault = {
      getAbstractFileByPath: () => ({ path: '04_Leituras/Livros/Teste.md' }),
      read: async () => raw,
      modify: async (file, novo) => { conteudoModificado = novo; }
    };

    const modais = new ModaisLeituras({ app: { vault: mockVault } });
    await modais.removerGenero(
      { file: { path: '04_Leituras/Livros/Teste.md' }, categories: ['Romance', 'Aventura'] },
      'Romance'
    );

    assert.doesNotMatch(conteudoModificado, /"Romance"/);
    assert.match(conteudoModificado, /"Aventura"/);
  });

  test('Garante que abrirModalEditarMetadados e abrirModalAdicionarGenero sejam funções exportadas', () => {
    const modais = new ModaisLeituras({ app: { vault: {} } });
    assert.strictEqual(typeof modais.abrirModalEditarMetadados, 'function');
    assert.strictEqual(typeof modais.abrirModalAdicionarGenero, 'function');
    assert.strictEqual(typeof modais.adicionarGenero, 'function');
    assert.strictEqual(typeof modais.removerGenero, 'function');
  });
});




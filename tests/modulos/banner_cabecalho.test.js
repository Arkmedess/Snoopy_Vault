/**
 * Snoopy Vault - Testes Unitários do Módulo 01: Banner e Cabeçalho
 * Executado nativamente via `node --test`.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createMockEl, carregarModulo } = require('../helpers/test_utils.js');
const UIKit = require('../../99_Meta/Snoopy/core/ui_kit.js');

// Mock global de Notice do Obsidian
global.Notice = class {
  constructor(msg) {
    this.message = msg;
  }
};

describe('Módulo 01 - Banner e Cabeçalho (01_snoopy_banner_cabecalho)', () => {
  const moduloBanner = carregarModulo('99_Meta/Snoopy/modulos/01_snoopy_banner_cabecalho.js');

  test('Exporta metadados canônicos do módulo', () => {
    assert.strictEqual(moduloBanner.id, 'snoopy_banner_cabecalho');
    assert.strictEqual(moduloBanner.titulo, 'Banner & Cabeçalho');
    assert.strictEqual(typeof moduloBanner.render, 'function');
  });

  test('Renderiza banner panorâmico, data formatada e pílulas de navegação', async () => {
    const root = createMockEl('div');
    const linksAbertos = [];
    const notasCriadas = [];

    const mockApp = {
      vault: {
        adapter: {
          getResourcePath: (p) => `app://local/${p}`
        }
      },
      workspace: {
        openLinkText: async (path) => {
          linksAbertos.push(path);
        }
      }
    };

    const mockCtx = {
      root,
      app: mockApp,
      now: new Date(2026, 9, 24), // 24 de Outubro de 2026
      formattedDate: 'sábado, 24 de outubro de 2026',
      garantirNotaDiaria: async () => ({ path: '01_Inbox/Diário/2026-10-24.md', basename: '2026-10-24' }),
      criarNotaInstantanea: (folder, tpl, prefix) => {
        notasCriadas.push({ folder, tpl, prefix });
      },
      config: {
        banner_imagem: '99_Meta/Attachments/snoopy_panoramic.jpg'
      },
      UIKit,
      renderIcon: (el, name, opts) => UIKit.renderIcon(el, name, opts)
    };

    await moduloBanner.render(mockCtx);

    // 1. Validação do Banner
    const bannerBox = root.querySelector('.snoopy-banner-box');
    assert.ok(bannerBox, 'Contêiner do banner deve existir');
    const img = bannerBox.querySelector('img');
    assert.ok(img);
    assert.strictEqual(img.alt, 'Snoopy Lendo Panorâmico');
    assert.strictEqual(img.src, 'app://local/99_Meta/Attachments/snoopy_panoramic.jpg');

    // 2. Validação da Data
    const dateTitle = root.querySelector('.snoopy-date-title');
    assert.ok(dateTitle);
    assert.strictEqual(dateTitle.innerText, 'Sábado, 24 de outubro de 2026');

    const metaSub = root.querySelector('.snoopy-meta');
    assert.ok(metaSub);
    assert.ok(metaSub.innerText.includes('Espaço Central de Foco'));
    assert.ok(!metaSub.innerText.includes('24-10-2026'), 'Data menor redundante deve ser removida');

    // 3. Validação das Ações de Navegação
    const navPills = root.querySelector('.snoopy-nav-pills');
    assert.ok(navPills);
    const botoes = navPills.querySelectorAll('button');
    assert.strictEqual(botoes.length, 7);

    // Disparar clique em HOJE
    const btnHoje = botoes[0];
    btnHoje.dispatchEvent('click');
    await new Promise(r => setImmediate(r));
    assert.strictEqual(linksAbertos.length, 1);
    assert.strictEqual(linksAbertos[0], '01_Inbox/Diário/2026-10-24.md');

    // Disparar clique em ESTUDOS
    const btnEstudos = botoes[1];
    btnEstudos.dispatchEvent('click');
    await new Promise(r => setImmediate(r));
    assert.strictEqual(linksAbertos.length, 2);
    assert.strictEqual(linksAbertos[1], '03_Estudos/Painel de Estudos.md');

    // Disparar clique em + PROJETO
    const btnProjeto = botoes.find(b => b.innerText.includes('PROJETO'));
    assert.ok(btnProjeto);
    btnProjeto.dispatchEvent('click');
    await new Promise(r => setImmediate(r));
    assert.strictEqual(notasCriadas.length, 1);
    assert.strictEqual(notasCriadas[0].folder, '02_Projetos');
    assert.strictEqual(notasCriadas[0].prefix, 'Novo Projeto');

    // Disparar clique em CONFIG
    const btnConfig = botoes[2];
    btnConfig.dispatchEvent('click');
    await new Promise(r => setImmediate(r));
    assert.strictEqual(linksAbertos.length, 3);
    assert.strictEqual(linksAbertos[2], '99_Meta/⚙️ Configurações.md');
  });

  test('Hero Command & Search Bar: interpreta comando "> adicionar nota tarefa" e cria tarefa', async () => {
    const root = createMockEl('div');
    let tarefaGravada = null;

    const mockApp = {
      vault: {
        adapter: { getResourcePath: () => 'app://local/banner.jpg' },
        getMarkdownFiles: () => [
          { basename: 'Arquitetura Hexagonal', path: '03_Estudos/Arquitetura Hexagonal.md' }
        ]
      },
      workspace: { openLinkText: async () => {} }
    };

    const mockCtx = {
      root,
      app: mockApp,
      now: new Date(2026, 9, 24),
      formattedDate: 'sábado, 24 de outubro de 2026',
      garantirNotaDiaria: async () => ({ path: '01_Inbox/Diário/2026-10-24.md', basename: '2026-10-24' }),
      criarNotaInstantanea: () => {},
      VaultStore: {
        adicionarLinhaNaSecao: async (app, path, secao, linha) => {
          tarefaGravada = { path, secao, linha };
        }
      },
      events: { emit: () => {} },
      UIKit
    };

    await moduloBanner.render(mockCtx);

    const input = root.querySelector('.snoopy-omni-input');
    const previewBox = root.querySelector('.snoopy-omni-preview-box');
    assert.ok(input, 'Input de comando deve existir');
    assert.ok(previewBox, 'Preview box deve existir');

    // Digitar comando
    input.value = '> adicionar nota tarefa Estudar Rust e Cargo';
    input.dispatchEvent('input');

    // Valida que o preview apareceu com a badge correspondente
    assert.strictEqual(previewBox.style.display, 'flex');
    assert.match(previewBox.innerHTML, /\[Nova Tarefa\]/);
    assert.match(previewBox.innerHTML, /Estudar Rust e Cargo/);

    // Pressionar Enter para executar
    input.dispatchEvent('keydown', { key: 'Enter' });
    await new Promise(r => setImmediate(r));

    assert.ok(tarefaGravada, 'Tarefa deve ter sido gravada no diário');
    assert.strictEqual(tarefaGravada.secao, 'Tarefas');
    assert.strictEqual(tarefaGravada.linha, '- [ ] Estudar Rust e Cargo');
  });

  test('Hero Command & Search Bar: busca notas do cofre em tempo real', async () => {
    const root = createMockEl('div');
    let linkAberto = null;

    const mockApp = {
      vault: {
        adapter: { getResourcePath: () => 'app://local/banner.jpg' },
        getMarkdownFiles: () => [
          { basename: 'Algoritmos e Estruturas', path: '03_Estudos/Algoritmos e Estruturas.md' },
          { basename: 'Clean Code', path: '04_Leituras/Livros/Clean Code.md' }
        ]
      },
      workspace: {
        openLinkText: async (p) => { linkAberto = p; }
      }
    };

    const mockCtx = {
      root,
      app: mockApp,
      now: new Date(2026, 9, 24),
      formattedDate: 'sábado, 24 de outubro de 2026',
      garantirNotaDiaria: async () => ({}),
      criarNotaInstantanea: () => {},
      UIKit
    };

    await moduloBanner.render(mockCtx);

    const input = root.querySelector('.snoopy-omni-input');
    const previewBox = root.querySelector('.snoopy-omni-preview-box');

    input.value = 'Clean';
    input.dispatchEvent('input');

    assert.strictEqual(previewBox.style.display, 'flex');
    assert.match(previewBox.innerHTML, /Clean Code/);

    // Pressionar Enter no resultado ativo
    input.dispatchEvent('keydown', { key: 'Enter' });
    await new Promise(r => setImmediate(r));

    assert.strictEqual(linkAberto, '04_Leituras/Livros/Clean Code.md');
  });

  test('Hero Command Bar CLI: suporta flags --prio, --data e --kanban em "> tarefa add"', async () => {
    const root = createMockEl('div');
    let tarefaGravada = null;

    const mockApp = {
      vault: {
        adapter: { getResourcePath: () => 'app://local/banner.jpg' },
        getMarkdownFiles: () => []
      },
      workspace: { openLinkText: async () => {} }
    };

    const mockCtx = {
      root,
      app: mockApp,
      now: new Date(2026, 9, 24),
      formattedDate: 'sábado, 24 de outubro de 2026',
      garantirNotaDiaria: async () => ({ path: '01_Inbox/Diário/2026-10-24.md', basename: '2026-10-24' }),
      criarNotaInstantanea: () => {},
      VaultStore: {
        adicionarLinhaNaSecao: async (app, path, secao, linha) => {
          tarefaGravada = { path, secao, linha };
        }
      },
      events: { emit: () => {} },
      UIKit
    };

    await moduloBanner.render(mockCtx);

    const input = root.querySelector('.snoopy-omni-input');
    const previewBox = root.querySelector('.snoopy-omni-preview-box');

    input.value = '> tarefa add Finalizar relatório técnico --prio alta --data 2026-10-28 --kanban';
    input.dispatchEvent('input');

    assert.strictEqual(previewBox.style.display, 'flex');
    assert.match(previewBox.innerHTML, /\[Nova Tarefa\]/);
    assert.match(previewBox.innerHTML, /Finalizar relatório técnico/);

    input.dispatchEvent('keydown', { key: 'Enter' });
    await new Promise(r => setImmediate(r));

    assert.ok(tarefaGravada, 'Tarefa deve ter sido gravada com metadados');
    assert.strictEqual(tarefaGravada.secao, 'Tarefas');
    assert.ok(tarefaGravada.linha.includes('Finalizar relatório técnico'));
    assert.ok(tarefaGravada.linha.includes('#prio/alta'));
    assert.ok(tarefaGravada.linha.includes('📅 2026-10-28'));
    assert.ok(tarefaGravada.linha.includes('#kanban'));
  });

  test('Hero Command Bar CLI: interpreta comando "> pomodoro start" e dispara evento', async () => {
    const root = createMockEl('div');
    let eventoEmitido = null;

    const mockApp = {
      vault: {
        adapter: { getResourcePath: () => 'app://local/banner.jpg' },
        getMarkdownFiles: () => []
      },
      workspace: { openLinkText: async () => {} }
    };

    const mockCtx = {
      root,
      app: mockApp,
      now: new Date(2026, 9, 24),
      formattedDate: 'sábado, 24 de outubro de 2026',
      garantirNotaDiaria: async () => ({}),
      criarNotaInstantanea: () => {},
      events: {
        emit: (nome, dados) => {
          eventoEmitido = { nome, dados };
        }
      },
      UIKit
    };

    await moduloBanner.render(mockCtx);

    const input = root.querySelector('.snoopy-omni-input');
    input.value = '> pomodoro start';
    input.dispatchEvent('input');

    input.dispatchEvent('keydown', { key: 'Enter' });
    await new Promise(r => setImmediate(r));

    assert.ok(eventoEmitido);
    assert.strictEqual(eventoEmitido.nome, 'pomodoro:comando');
    assert.strictEqual(eventoEmitido.dados.acao, 'start');
  });

  test('Hero Command Bar CLI: executa comando via clique no botão submit e via mousedown no item de preview', async () => {
    const root = createMockEl('div');
    let tarefaCriada = null;

    const mockApp = {
      vault: {
        adapter: { getResourcePath: () => 'app://local/banner.jpg' },
        getMarkdownFiles: () => []
      },
      workspace: { openLinkText: async () => {} }
    };

    const mockCtx = {
      root,
      app: mockApp,
      now: new Date(2026, 9, 24),
      formattedDate: 'sábado, 24 de outubro de 2026',
      garantirNotaDiaria: async () => ({ path: '01_Inbox/Diário/2026-10-24.md', basename: '2026-10-24' }),
      criarNotaInstantanea: () => {},
      VaultStore: {
        adicionarLinhaNaSecao: async (app, path, secao, linha) => {
          tarefaCriada = { path, secao, linha };
        }
      },
      events: { emit: () => {} },
      UIKit
    };

    await moduloBanner.render(mockCtx);

    const input = root.querySelector('.snoopy-omni-input');
    const submitBtn = root.querySelector('.snoopy-omni-submit-btn');
    const previewBox = root.querySelector('.snoopy-omni-preview-box');

    assert.ok(submitBtn, 'Botão de submissão na barra deve existir');

    // 1. Testa execução pelo botão Submit
    input.value = '> tarefa add Criar documentação da API';
    input.dispatchEvent('input');

    submitBtn.dispatchEvent('click');
    await new Promise(r => setImmediate(r));

    assert.ok(tarefaCriada, 'Tarefa deve ter sido criada via submitBtn');
    assert.ok(tarefaCriada.linha.includes('Criar documentação da API'));

    // 2. Testa execução por mousedown no preview
    tarefaCriada = null;
    input.value = '> tarefa add Revisar pull request';
    input.dispatchEvent('input');

    const previewItem = previewBox.querySelector('.snoopy-omni-item');
    assert.ok(previewItem, 'Item de preview deve existir');

    previewItem.dispatchEvent('mousedown');
    await new Promise(r => setImmediate(r));

    assert.ok(tarefaCriada, 'Tarefa deve ter sido criada via mousedown no preview');
    assert.ok(tarefaCriada.linha.includes('Revisar pull request'));
  });

  test('Hero Command Bar CLI: suporta flags curtas (-p, -d, -k) e data relativa em "> tarefa add"', async () => {
    const root = createMockEl('div');
    let tarefaGravada = null;

    const mockApp = {
      vault: {
        adapter: { getResourcePath: () => 'app://local/banner.jpg' },
        getMarkdownFiles: () => []
      },
      workspace: { openLinkText: async () => {} }
    };

    const mockCtx = {
      root,
      app: mockApp,
      now: new Date(2026, 9, 24),
      formattedDate: 'sábado, 24 de outubro de 2026',
      garantirNotaDiaria: async () => ({ path: '01_Inbox/Diário/2026-10-24.md', basename: '2026-10-24' }),
      criarNotaInstantanea: () => {},
      VaultStore: {
        adicionarLinhaNaSecao: async (app, path, secao, linha) => {
          tarefaGravada = { path, secao, linha };
        }
      },
      events: { emit: () => {} },
      UIKit
    };

    await moduloBanner.render(mockCtx);

    const input = root.querySelector('.snoopy-omni-input');
    input.value = '> tarefa add "Refatorar módulo" -p alta -d hoje -k';
    input.dispatchEvent('input');

    input.dispatchEvent('keydown', { key: 'Enter' });
    await new Promise(r => setImmediate(r));

    assert.ok(tarefaGravada, 'Tarefa deve ter sido gravada');
    assert.strictEqual(tarefaGravada.secao, 'Tarefas');
    assert.ok(tarefaGravada.linha.includes('Refatorar módulo'), 'Deve remover aspas extras');
    assert.ok(!tarefaGravada.linha.includes('"'), 'Não deve conter aspas no texto da tarefa');
    assert.ok(tarefaGravada.linha.includes('#prio/alta'));
    assert.ok(tarefaGravada.linha.includes('📅 2026-10-24'));
    assert.ok(tarefaGravada.linha.includes('#kanban'));
  });

  test('Hero Command Bar CLI: suporta comandos "> hoje" e "> leitura add"', async () => {
    const root = createMockEl('div');
    const linksAbertos = [];
    const notasCriadas = [];

    const mockApp = {
      vault: {
        adapter: { getResourcePath: () => 'app://local/banner.jpg' },
        getMarkdownFiles: () => []
      },
      workspace: {
        openLinkText: async (p) => { linksAbertos.push(p); }
      }
    };

    const mockCtx = {
      root,
      app: mockApp,
      now: new Date(2026, 9, 24),
      formattedDate: 'sábado, 24 de outubro de 2026',
      garantirNotaDiaria: async () => ({ path: '01_Inbox/Diário/2026-10-24.md', basename: '2026-10-24' }),
      criarNotaInstantanea: (folder, tpl, prefix) => {
        notasCriadas.push({ folder, tpl, prefix });
      },
      events: { emit: () => {} },
      UIKit
    };

    await moduloBanner.render(mockCtx);

    const input = root.querySelector('.snoopy-omni-input');

    // 1. Comando > hoje
    input.value = '> hoje';
    input.dispatchEvent('input');
    input.dispatchEvent('keydown', { key: 'Enter' });
    await new Promise(r => setImmediate(r));

    assert.strictEqual(linksAbertos.length, 1);
    assert.strictEqual(linksAbertos[0], '01_Inbox/Diário/2026-10-24.md');

    // 2. Comando > leitura add O Programador Pragmático
    input.value = '> leitura add O Programador Pragmático';
    input.dispatchEvent('input');
    input.dispatchEvent('keydown', { key: 'Enter' });
    await new Promise(r => setImmediate(r));

    assert.strictEqual(notasCriadas.length, 1);
    assert.strictEqual(notasCriadas[0].folder, '04_Leituras/Livros');
    assert.strictEqual(notasCriadas[0].prefix, 'O Programador Pragmático');
  });

  test('Hero Command Bar CLI: suporta comandos estendidos de pomodoro (stop, next) e aliases (pomo)', async () => {
    const root = createMockEl('div');
    const eventos = [];

    const mockApp = {
      vault: {
        adapter: { getResourcePath: () => 'app://local/banner.jpg' },
        getMarkdownFiles: () => []
      },
      workspace: { openLinkText: async () => {} }
    };

    const mockCtx = {
      root,
      app: mockApp,
      now: new Date(2026, 9, 24),
      formattedDate: 'sábado, 24 de outubro de 2026',
      garantirNotaDiaria: async () => ({}),
      criarNotaInstantanea: () => {},
      events: {
        emit: (nome, dados) => {
          eventos.push({ nome, dados });
        }
      },
      UIKit
    };

    await moduloBanner.render(mockCtx);

    const input = root.querySelector('.snoopy-omni-input');

    // 1. > pomo stop
    input.value = '> pomo stop';
    input.dispatchEvent('input');
    input.dispatchEvent('keydown', { key: 'Enter' });
    await new Promise(r => setImmediate(r));

    assert.strictEqual(eventos.length, 1);
    assert.strictEqual(eventos[0].nome, 'pomodoro:comando');
    assert.strictEqual(eventos[0].dados.acao, 'reset');

    // 2. > pomodoro next
    input.value = '> pomodoro next';
    input.dispatchEvent('input');
    input.dispatchEvent('keydown', { key: 'Enter' });
    await new Promise(r => setImmediate(r));

    assert.strictEqual(eventos.length, 2);
    assert.strictEqual(eventos[1].nome, 'pomodoro:comando');
    assert.strictEqual(eventos[1].dados.acao, 'proximo');
  });

  test('Hero Command Bar CLI: filtra lista de comandos dinamicamente na digitação', async () => {
    const root = createMockEl('div');

    const mockApp = {
      vault: {
        adapter: { getResourcePath: () => 'app://local/banner.jpg' },
        getMarkdownFiles: () => []
      },
      workspace: { openLinkText: async () => {} }
    };

    const mockCtx = {
      root,
      app: mockApp,
      now: new Date(2026, 9, 24),
      formattedDate: 'sábado, 24 de outubro de 2026',
      garantirNotaDiaria: async () => ({}),
      criarNotaInstantanea: () => {},
      events: { emit: () => {} },
      UIKit
    };

    await moduloBanner.render(mockCtx);

    const input = root.querySelector('.snoopy-omni-input');
    const previewBox = root.querySelector('.snoopy-omni-preview-box');

    // Digita prefixo > t
    input.value = '> t';
    input.dispatchEvent('input');

    assert.strictEqual(previewBox.style.display, 'flex');
    assert.match(previewBox.innerHTML, /tarefa/i);
    // Não deve exibir pomodoro nas opções filtradas de tarefa
    assert.doesNotMatch(previewBox.innerHTML, /pomodoro start/i);
  });
});

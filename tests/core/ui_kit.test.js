/**
 * Snoopy Vault - Testes Unitários de UIKit
 * Valida o catálogo de ícones vetoriais SVG, renderização e factory de botões/headers.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

function createMockEl(tag = 'div', attrs = {}) {
  let _innerHTML = '';
  const listeners = {};
  const el = {
    tagName: tag.toUpperCase(),
    className: attrs.class || '',
    style: {},
    children: [],
    listeners,
    get innerText() {
      return _innerHTML;
    },
    set innerText(val) {
      _innerHTML = val;
    },
    get innerHTML() {
      return _innerHTML;
    },
    set innerHTML(val) {
      _innerHTML = val;
    },
    createEl: (childTag, opts = {}) => {
      const child = createMockEl(childTag, opts.attr || {});
      if (opts.cls) child.className = opts.cls;
      if (opts.text) {
        child.innerText = opts.text;
        child.innerHTML = opts.text;
      }
      el.children.push(child);
      return child;
    },
    appendChild: (child) => {
      el.children.push(child);
      return child;
    },
    addEventListener: (evt, fn) => {
      if (!listeners[evt]) listeners[evt] = [];
      listeners[evt].push(fn);
    },
    dispatchEvent: (evt) => {
      if (listeners[evt.type]) {
        listeners[evt.type].forEach(fn => fn(evt));
      }
    }
  };
  return el;
}

const UIKit = require('../../99_Meta/Snoopy/core/ui_kit.js');

describe('UIKit - Núcleo de Componentes de Interface', () => {
  describe('Catálogo Canônico de Ícones Vetoriais SVG (Lucide)', () => {
    test('catálogo UIKit.ICONS deve conter os vetores essenciais que substituem emojis', () => {
      const iconesObrigatorios = [
        'check', 'x', 'star', 'target', 'trash-2', 'search',
        'sparkles', 'refresh-cw', 'shield', 'sun', 'sunrise',
        'moon', 'repeat', 'pencil', 'play', 'pause', 'calendar', 'settings'
      ];

      for (const icone of iconesObrigatorios) {
        assert.ok(UIKit.ICONS[icone], `Ícone '${icone}' deve estar definido no catálogo UIKit.ICONS`);
        assert.ok(typeof UIKit.ICONS[icone] === 'string' && UIKit.ICONS[icone].length > 5, `SVG do ícone '${icone}' deve ser válido`);
      }
    });

    test('UIKit.renderIcon() insere span .snoopy-icon com SVG configurado', () => {
      const parent = createMockEl('div');
      const iconEl = UIKit.renderIcon(parent, 'check', { size: 16, color: '#86efac', cls: 'minha-classe' });

      assert.equal(iconEl.tagName, 'SPAN');
      assert.ok(iconEl.className.includes('snoopy-icon'));
      assert.ok(iconEl.className.includes('minha-classe'));
      assert.ok(iconEl.innerHTML.includes('<svg viewBox="0 0 24 24"'));
      assert.ok(iconEl.innerHTML.includes('stroke="#86efac"'));
      assert.ok(iconEl.innerHTML.includes('width="16"'));
      assert.equal(iconEl.style.width, '16px');
      assert.equal(iconEl.style.height, '16px');
    });

    test('UIKit.renderIcon() utiliza círculo de fallback seguro para ícones não mapeados', () => {
      const parent = createMockEl('div');
      const iconEl = UIKit.renderIcon(parent, 'icone-inexistente-xyz');

      assert.ok(iconEl.innerHTML.includes('circle cx="12" cy="12" r="8"'));
    });
  });

  describe('Design System de Botões (UIKit.criarBotao)', () => {
    test('cria botão primário com classes semânticas corretas', () => {
      const parent = createMockEl('div');
      const btn = UIKit.criarBotao(parent, {
        label: 'Salvar Item',
        variant: 'primary',
        size: 'md'
      });

      assert.equal(btn.tagName, 'BUTTON');
      assert.ok(btn.className.includes('snoopy-btn-primary'));
      assert.equal(btn.children[0].innerText, 'Salvar Item');
    });

    test('cria botão de ícone com formato simétrico e classe snoopy-btn-icon', () => {
      const parent = createMockEl('div');
      const btn = UIKit.criarBotao(parent, {
        icon: 'trash-2',
        variant: 'icon',
        size: 'sm',
        title: 'Excluir'
      });

      assert.ok(btn.className.includes('snoopy-btn-icon'));
      assert.ok(btn.className.includes('snoopy-btn-sm'));
      assert.equal(btn.title, 'Excluir');
      assert.ok(btn.children.some(c => c.className.includes('snoopy-icon')));
    });

    test('suporta variante danger, active e block', () => {
      const parent = createMockEl('div');
      const btn = UIKit.criarBotao(parent, {
        label: 'Excluir Definitivo',
        variant: 'danger',
        active: true,
        block: true
      });

      assert.ok(btn.className.includes('snoopy-btn-danger'));
      assert.ok(btn.className.includes('active'));
      assert.ok(btn.className.includes('snoopy-btn-block'));
    });

    test('executa handler onClick ao disparar clique', async () => {
      const parent = createMockEl('div');
      let clicado = false;
      const btn = UIKit.criarBotao(parent, {
        label: 'Ação',
        onClick: () => { clicado = true; }
      });

      btn.dispatchEvent({ type: 'click' });
      assert.equal(clicado, true);
    });
  });

  describe('Estrutura de Cabeçalho (UIKit.criarCardHeader)', () => {
    test('cria estrutura completa com título, metadados e subtítulo', () => {
      const parent = createMockEl('div');
      const header = UIKit.criarCardHeader(parent, {
        title: 'Quadro Kanban',
        meta: '3 CARDS',
        subtitle: 'PROJETOS ATIVOS'
      });

      assert.ok(header.container.className.includes('snoopy-card-header'));
      assert.ok(header.titleBox.className.includes('snoopy-toolbar'));
      assert.ok(header.actionsBox.className.includes('snoopy-toolbar'));

      const textos = header.titleBox.children.map(c => c.innerText);
      assert.ok(textos.includes('Quadro Kanban'));
      assert.ok(textos.includes('3 CARDS'));
      assert.ok(textos.includes('PROJETOS ATIVOS'));
    });
  });
});


describe('UIKit - Padronização v2 (ícones ampliados, plural e estado vazio)', () => {
  test('catálogo inclui ícones da padronização v2', () => {
    const novos = [
      'plus-circle', 'arrow-up-right', 'skip-forward', 'list-checks', 'timer',
      'library', 'graduation-cap', 'bar-chart-3', 'percent', 'file-text',
      'info', 'grip-vertical', 'chevron-left', 'chevron-right', 'circle-dot', 'kanban'
    ];
    for (const icone of novos) {
      assert.ok(UIKit.ICONS[icone], `Ícone '${icone}' deve existir`);
    }
  });

  test('pluralizar() concorda singular e plural com o número', () => {
    assert.equal(UIKit.pluralizar(1, 'matéria', 'matérias'), '1 matéria');
    assert.equal(UIKit.pluralizar(0, 'matéria', 'matérias'), '0 matérias');
    assert.equal(UIKit.pluralizar(3, 'revisão pendente', 'revisões pendentes'), '3 revisões pendentes');
  });

  test('pluralizar() aceita omitir o número', () => {
    assert.equal(UIKit.pluralizar(2, 'ciclo', 'ciclos', { incluirNumero: false }), 'ciclos');
  });

  test('criarEstadoVazio() monta ícone, título, descrição e ação', () => {
    const parent = createMockEl('div');
    let clicado = false;
    const vazio = UIKit.criarEstadoVazio(parent, {
      icon: 'kanban',
      titulo: 'Nenhum projeto aqui',
      descricao: 'Arraste um card ou crie um novo.',
      acao: { label: 'Novo projeto', icon: 'plus', onClick: () => { clicado = true; } }
    });

    assert.ok(vazio.className.includes('snoopy-empty'));
    const classes = vazio.children.map(c => c.className);
    assert.ok(classes.some(c => c.includes('snoopy-icon')));
    assert.ok(classes.includes('snoopy-empty-title'));
    assert.ok(classes.includes('snoopy-empty-desc'));

    const botao = vazio.children.find(c => c.tagName === 'BUTTON');
    assert.ok(botao, 'deve renderizar botão de ação');
    botao.dispatchEvent({ type: 'click', stopPropagation() {} });
    assert.equal(clicado, true);
  });

  test('criarCardHeader() suporta ícone e subtítulo abaixo do título', () => {
    const parent = createMockEl('div');
    const { container } = UIKit.criarCardHeader(parent, { title: 'Tarefas', icon: 'list-checks', subtitle: 'O que precisa sair hoje' });
    const titleBox = container.children[0];
    const linha = titleBox.children[0];
    assert.ok(linha.children.some(c => c.className.includes('snoopy-icon')));
    assert.ok(titleBox.children.some(c => c.className === 'snoopy-card-subtitle'));
  });
});

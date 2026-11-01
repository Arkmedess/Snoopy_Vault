/**
 * Snoopy Vault - Testes Unitários da Aba Unificada Ciclo & Revisões (Estudos)
 * Executado nativamente via `node --test`.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { renderAbaCicloRevisoes } = require('../../../99_Meta/Snoopy/subdashboards/estudos/abas/aba_ciclo_revisoes.js');
const { createMockEl } = require('../../helpers/test_utils.js');

describe('Subdashboard Estudos - Aba Ciclo & Revisões (AbaCicloRevisoes)', () => {
  test('Exporta a função renderAbaCicloRevisoes', () => {
    assert.strictEqual(typeof renderAbaCicloRevisoes, 'function');
  });

  test('Limpa o contêiner raiz antes de renderizar', () => {
    const root = createMockEl('div');
    root.createEl('div', { text: 'conteudo-antigo' });
    assert.strictEqual(root.children.length, 1);

    const mockCtx = {
      renderAbaCiclo: (box) => box.createEl('div', { text: 'ciclo-renderizado' }),
      renderAbaRevisoes: (box) => box.createEl('div', { text: 'revisoes-renderizado' })
    };

    renderAbaCicloRevisoes(root, mockCtx);
    assert.strictEqual(root.children.length, 1, 'Deve conter apenas o wrapper principal');
    const wrapper = root.children[0];
    assert.strictEqual(wrapper.children.length, 2, 'Wrapper deve conter cicloBox e revisoesBox');
  });

  test('Renderiza os dois blocos (Ciclo e Revisões) delegando para funções injetadas em ctx', () => {
    const root = createMockEl('div');
    let cicloChamado = false;
    let revisoesChamado = false;
    let contextoRecebidoCiclo = null;
    let contextoRecebidoRev = null;

    const mockCtx = {
      disciplinas: [{ nome: 'Direito Constitucional', minutos: 120 }],
      estado: { disciplinaAtualIdx: 0, revisoes: [] },
      renderAbaCiclo: (container, ctx) => {
        cicloChamado = true;
        contextoRecebidoCiclo = ctx;
        container.createEl('div', { cls: 'mock-ciclo-content', text: 'Ciclo Ativo' });
      },
      renderAbaRevisoes: (container, ctx) => {
        revisoesChamado = true;
        contextoRecebidoRev = ctx;
        container.createEl('div', { cls: 'mock-revisoes-content', text: 'Revisões Ativas' });
      }
    };

    renderAbaCicloRevisoes(root, mockCtx);

    assert.strictEqual(cicloChamado, true, 'Deve invocar renderAbaCiclo injetada');
    assert.strictEqual(revisoesChamado, true, 'Deve invocar renderAbaRevisoes injetada');
    assert.strictEqual(contextoRecebidoCiclo, mockCtx, 'Deve repassar ctx intacto para o Ciclo');
    assert.strictEqual(contextoRecebidoRev, mockCtx, 'Deve repassar ctx intacto para as Revisões');

    const wrapper = root.children[0];
    const cicloBox = wrapper.children[0];
    const revisoesBox = wrapper.children[1];

    assert.ok(cicloBox.attrs.class.includes('snoopy-card-box'));
    assert.ok(revisoesBox.attrs.class.includes('snoopy-card-box'));
  });

  test('Fallback para require local de aba_ciclo.js e aba_revisoes.js quando não injetados em ctx', () => {
    const root = createMockEl('div');
    const mockCtx = {
      app: { workspace: { openLinkText: () => {} } },
      disciplinas: [
        { nome: 'Arquitetura de Software', area: 'TI', minutos: 180, path: '03_Estudos/Arq.md' }
      ],
      estado: {
        disciplinaAtualIdx: 0,
        cicloOrdem: ['Arquitetura de Software'],
        revisoes: []
      },
      revisaoFiltro: 'programadas',
      setRevisaoFiltro: () => {},
      obterFilaDoCiclo: (discs) => discs,
      salvarEstado: async () => {},
      onReload: () => {}
    };

    // Não fornecemos renderAbaCiclo nem renderAbaRevisoes no ctx
    renderAbaCicloRevisoes(root, mockCtx);

    const wrapper = root.children[0];
    assert.strictEqual(wrapper.children.length, 2);

    const cicloBox = wrapper.children[0];
    const revisoesBox = wrapper.children[1];

    // Os submódulos reais aba_ciclo.js e aba_revisoes.js devem renderizar elementos dentro de seus respectivos boxes
    assert.ok(cicloBox.children.length > 0, 'Ciclo carregado via require deve renderizar elementos no box');
    assert.ok(revisoesBox.children.length > 0, 'Revisões carregadas via require deve renderizar elementos no box');
  });

  test('Renderiza fallback textual quando renderCicloFn e renderRevFn não puderem ser resolvidas', () => {
    const root = createMockEl('div');
    const mockCtx = {
      renderAbaCiclo: 'nao-e-funcao',
      renderAbaRevisoes: 'nao-e-funcao'
    };

    renderAbaCicloRevisoes(root, mockCtx);

    const wrapper = root.children[0];
    const cicloBox = wrapper.children[0];
    const revisoesBox = wrapper.children[1];

    function findText(el, text) {
      if (el.innerText && el.innerText.includes(text)) return true;
      if (el.children) return el.children.some(c => findText(c, text));
      return false;
    }

    assert.ok(findText(cicloBox, 'CICLO DE ESTUDOS - FILA SEQUENCIAL'), 'Deve exibir texto de fallback do ciclo');
    assert.ok(findText(revisoesBox, 'REVISÕES ESPAÇADAS - CURVA DE ESQUECIMENTO'), 'Deve exibir texto de fallback das revisões');
  });

  test('Suporta estado vazio (sem disciplinas e sem revisões) sem lançar exceções', () => {
    const root = createMockEl('div');
    const mockCtx = {
      app: { workspace: { openLinkText: () => {} } },
      disciplinas: [],
      estado: {
        disciplinaAtualIdx: 0,
        cicloOrdem: [],
        revisoes: []
      },
      obterFilaDoCiclo: () => [],
      salvarEstado: async () => {},
      onReload: () => {}
    };

    assert.doesNotThrow(() => {
      renderAbaCicloRevisoes(root, mockCtx);
    });

    assert.strictEqual(root.children.length, 1);
  });

  test('Lida de forma segura com objeto de contexto mínimo ({})', () => {
    const root = createMockEl('div');

    assert.doesNotThrow(() => {
      renderAbaCicloRevisoes(root, {});
    });

    assert.strictEqual(root.children.length, 1);
  });
});

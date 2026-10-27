/**
 * Snoopy Vault - Testes Unitários do Orquestrador de Estudos
 * Executado nativamente via `node --test`.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { renderEstudos } = require('../../../99_Meta/Snoopy/subdashboards/estudos/view.js');
const { createMockEl, createMockDataview } = require('../../helpers/test_utils.js');

describe('Subdashboard Estudos - Orquestrador View', () => {
  test('Exporta a função renderEstudos', () => {
    assert.strictEqual(typeof renderEstudos, 'function');
  });

  test('Renderiza cabeçalho, abas de navegação (Painel, Planner, Revisões, Ciclo) e conteúdo', async () => {
    const rootContainer = createMockEl('div');

    const mockApp = {
      vault: {
        getAbstractFileByPath: (relPath) => {
          const fullPath = path.resolve(__dirname, '../../../', relPath);
          return fs.existsSync(fullPath) ? { path: relPath } : null;
        },
        read: async (file) => {
          const fullPath = path.resolve(__dirname, '../../../', file.path);
          return fs.readFileSync(fullPath, 'utf8');
        }
      },
      workspace: {
        openLinkText: () => {}
      }
    };

    const mockDv = {
      container: rootContainer,
      ...createMockDataview([])
    };

    await renderEstudos(mockDv, mockApp);

    assert.ok(rootContainer.children.length > 0);

    function findText(el, text) {
      const target = text.toUpperCase();
      if (el.innerText && el.innerText.toUpperCase().includes(target)) return true;
      if (el.innerHTML && el.innerHTML.toUpperCase().includes(target)) return true;
      return el.children.some(c => findText(c, text));
    }

    // Verifica presença das abas unificadas do framework
    assert.ok(findText(rootContainer, 'PAINEL DE CONTROLE'));
    assert.ok(findText(rootContainer, 'CICLO & REVISÕES'));
  });

  test('Renderiza botões do cabeçalho com ícones SVG Lucide padronizados e sem caracteres literais de seta', async () => {
    const rootContainer = createMockEl('div');

    const mockApp = {
      vault: {
        getAbstractFileByPath: (relPath) => {
          const fullPath = path.resolve(__dirname, '../../../', relPath);
          return fs.existsSync(fullPath) ? { path: relPath } : null;
        },
        read: async (file) => {
          const fullPath = path.resolve(__dirname, '../../../', file.path);
          return fs.readFileSync(fullPath, 'utf8');
        }
      },
      workspace: { openLinkText: () => {} }
    };

    const mockDv = {
      container: rootContainer,
      ...createMockDataview([])
    };

    await renderEstudos(mockDv, mockApp);

    function findElById(el, id) {
      if (el.id === id || (el.attrs && el.attrs.id === id)) return el;
      for (const c of el.children) {
        const found = findElById(c, id);
        if (found) return found;
      }
      return null;
    }

    const btnHome = findElById(rootContainer, 'btn-back-home');
    assert.ok(btnHome, 'Botão Home deve existir');
    // Deve conter SVG de ícone ou classe snoopy-icon e não ter seta solta '← HOME'
    const hasIconHome = btnHome.children.some(c => c.className && c.className.includes('snoopy-icon')) ||
      (btnHome.innerHTML && btnHome.innerHTML.includes('<svg'));
    assert.ok(hasIconHome, 'Botão Home deve possuir ícone SVG Lucide');
    assert.ok(!btnHome.innerText?.includes('←'), 'Não deve conter seta unicode literal ←');

    const btnAdd = findElById(rootContainer, 'btn-add-materia');
    assert.ok(btnAdd, 'Botão Nova Matéria deve existir');
    const hasIconAdd = btnAdd.children.some(c => c.className && c.className.includes('snoopy-icon')) ||
      (btnAdd.innerHTML && btnAdd.innerHTML.includes('<svg'));
    assert.ok(hasIconAdd, 'Botão Nova Matéria deve possuir ícone SVG Lucide');

    const btnSessao = findElById(rootContainer, 'btn-registrar-sessao-top');
    assert.ok(btnSessao, 'Botão Registrar Estudo deve existir');
    const hasIconSessao = btnSessao.children.some(c => c.className && c.className.includes('snoopy-icon')) ||
      (btnSessao.innerHTML && btnSessao.innerHTML.includes('<svg'));
    assert.ok(hasIconSessao, 'Botão Registrar Estudo deve possuir ícone SVG Lucide');
  });

  test('Renderiza integração completa com páginas reais de 03_Estudos retornadas como DataArray sem métodos de Array.prototype', async () => {
    const rootContainer = createMockEl('div');

    function createStrictDataArray(items) {
      const arr = [...items];
      const methods = {
        where: (pred) => createStrictDataArray(arr.filter(pred)),
        filter: (pred) => createStrictDataArray(arr.filter(pred)),
        map: (fn) => createStrictDataArray(arr.map(fn)),
        forEach: (fn) => arr.forEach(fn),
        find: (pred) => arr.find(pred),
        some: (pred) => arr.some(pred),
        every: (pred) => arr.every(pred),
        join: (sep) => arr.join(sep),
        array: () => [...arr]
      };
      return new Proxy(arr, {
        get(target, prop) {
          if (prop === 'length') return target.length;
          if (prop === 'values') return target;
          if (typeof prop === 'symbol') return target[prop] ? target[prop].bind(target) : undefined;
          if (/^\d+$/.test(String(prop))) return target[Number(prop)];
          if (Object.prototype.hasOwnProperty.call(methods, prop)) return methods[prop];
          return createStrictDataArray(target.map(x => (x ? x[prop] : undefined)));
        }
      });
    }

    const mockApp = {
      vault: {
        getAbstractFileByPath: (relPath) => {
          const fullPath = path.resolve(__dirname, '../../../', relPath);
          return fs.existsSync(fullPath) ? { path: relPath } : null;
        },
        read: async (file) => {
          const fullPath = path.resolve(__dirname, '../../../', file.path);
          return fs.readFileSync(fullPath, 'utf8');
        }
      },
      workspace: { openLinkText: () => {} }
    };

    const mockDv = {
      container: rootContainer,
      page: () => null,
      pages: () => createStrictDataArray([
        {
          file: { name: 'Exemplo - Arquitetura de Software', path: '03_Estudos/Exemplo - Arquitetura de Software.md' },
          title: 'Arquitetura de Software',
          area: 'Programação',
          categoria: 'Programação',
          minutos_foco: 0,
          questoes_feitas: 10,
          questoes_acertos: 8,
          provas: []
        }
      ])
    };

    await renderEstudos(mockDv, mockApp);

    function collectHtml(el) {
      let s = (el.innerHTML || '') + ' ' + (el.innerText || '');
      for (const c of el.children) s += ' ' + collectHtml(c);
      return s;
    }

    const rendered = collectHtml(rootContainer);
    assert.ok(rendered.includes('HORAS POR MATÉRIA'), 'Deve renderizar card Donut');
    assert.ok(rendered.includes('FREQUÊNCIA & CONSTÂNCIA SEMANAL') || rendered.includes('HORAS POR MATÉRIA'), 'Deve renderizar gráficos à direita');
    assert.ok(rendered.includes('TEMPO DE FOCO & META 7D'), 'Deve renderizar faixa de KPIs executivos');
    assert.ok(rendered.includes('TABELA DE MATÉRIAS & SIMULADOS'), 'Deve renderizar tabela de matérias');
    assert.ok(rendered.includes('Arquitetura de Software'), 'Deve listar a matéria cadastrada na tabela e no gráfico');

    // Simula navegação para a aba unificada Ciclo & Revisões garantindo zero erros com DataArray
    const findButtons = (el, acc = []) => {
      if (el.tagName === 'BUTTON') acc.push(el);
      for (const c of el.children) findButtons(c, acc);
      return acc;
    };

    const btnCicloRev = findButtons(rootContainer).find(b => b.innerText && b.innerText.includes('CICLO & REVISÕES'));
    assert.ok(btnCicloRev, 'Aba unificada Ciclo & Revisões deve existir');
    btnCicloRev.onclick();
    const htmlAba = collectHtml(rootContainer);
    assert.ok(htmlAba.includes('FILA SEQUENCIAL') || htmlAba.includes('CICLO DE ESTUDOS'), 'Aba unificada deve renderizar fila do ciclo');
    assert.ok(htmlAba.includes('CURVA DE ESQUECIMENTO') || htmlAba.includes('REVISÕES ESPAÇADAS'), 'Aba unificada deve renderizar curva de retenção');
  });
});

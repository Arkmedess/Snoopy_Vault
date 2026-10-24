/**
 * Snoopy Vault - Testes Unitários do Módulo 05: Vitrine de Leituras e Estudos
 * Executado nativamente via `node --test`.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createMockEl, carregarModulo, createMockDataview } = require('../helpers/test_utils.js');
const UIKit = require('../../99_Meta/Snoopy/core/ui_kit.js');

describe('Módulo 05 - Vitrine de Estudos e Leituras (05_snoopy_leituras_estudos.js)', () => {
  const moduloLeiturasEstudos = carregarModulo('99_Meta/Snoopy/modulos/05_snoopy_leituras_estudos.js');

  test('Exporta identificador canônico e método render', () => {
    assert.strictEqual(moduloLeiturasEstudos.id, 'snoopy_leituras_estudos');
    assert.strictEqual(moduloLeiturasEstudos.titulo, 'Estudos & Bookshelf de Leituras');
    assert.strictEqual(typeof moduloLeiturasEstudos.render, 'function');
  });

  test('Renderiza grid 50/50 com vitrine de estudos e estante de livros', async () => {
    const root = createMockEl('div');

    const mockPages = [
      {
        file: { name: 'Direito Penal', path: '03_Estudos/Direito Penal.md', folder: '03_Estudos' },
        area: 'Jurídica',
        minutos_foco: 60
      },
      {
        file: { name: 'O Programador Pragmático', path: '04_Leituras/Livros/O Programador Pragmático.md', folder: '04_Leituras' },
        paginas_lidas: 120,
        total_paginas: 300,
        status: 'Lendo'
      }
    ];

    const mockDv = createMockDataview(mockPages);

    const mockCicloData = {
      disciplinaAtualIdx: 0,
      cicloOrdem: ['Direito Penal'],
      historicoDiario: {}
    };

    const mockApp = {
      vault: {
        getAbstractFileByPath: (p) => {
          if (p === '99_Meta/ciclo-estudos.json') return { path: p };
          return null;
        },
        read: async (file) => {
          if (file.path === '99_Meta/ciclo-estudos.json') return JSON.stringify(mockCicloData);
          return '';
        },
        adapter: {
          getResourcePath: (p) => `app://local/${p}`
        }
      },
      workspace: {
        openLinkText: () => {}
      }
    };

    const mockCtx = {
      root,
      app: mockApp,
      dv: mockDv,
      todayStr: '2026-10-24',
      UIKit,
      renderIcon: (el, name, opts) => UIKit.renderIcon(el, name, opts)
    };

    await moduloLeiturasEstudos.render(mockCtx);

    const showcaseGrid = root.querySelector('.snoopy-showcase-grid');
    assert.ok(showcaseGrid, 'Grid 50/50 deve ser renderizado');
    assert.strictEqual(showcaseGrid.children.length, 2, 'Deve conter coluna de Estudos e Estante');

    function findText(el, text) {
      if (el.innerText && el.innerText.includes(text)) return true;
      if (el.innerHTML && el.innerHTML.includes(text)) return true;
      return el.children.some(c => findText(c, text));
    }

    // Coluna 1: Estudos
    const colEstudos = showcaseGrid.children[0];
    assert.ok(findText(colEstudos, 'ESTUDOS'));
    assert.ok(findText(colEstudos, 'Ciclo de estudos e matérias ativas'));

    // Coluna 2: Estante
    const colEstante = showcaseGrid.children[1];
    assert.ok(findText(colEstante, 'ESTANTE'));
    assert.ok(findText(colEstante, 'Leituras ativas e biblioteca'));
    assert.ok(findText(colEstante, 'O Programador Pragmático'));
  });
});

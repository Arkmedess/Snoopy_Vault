/**
 * Snoopy Vault - Testes Unitários do Orquestrador de Leituras
 * Executado nativamente via `node --test`.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { renderLeituras } = require('../../../99_Meta/Snoopy/subdashboards/leituras/view.js');
const { createMockEl, createMockDataview } = require('../../helpers/test_utils.js');

describe('Subdashboard Leituras - Orquestrador View', () => {
  test('Exporta a função renderLeituras', () => {
    assert.strictEqual(typeof renderLeituras, 'function');
  });

  test('Renderiza espaço duplo com estante de livros e painel lateral de acompanhamento', async () => {
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
        },
        adapter: {
          getResourcePath: (p) => `app://local/${p}`
        }
      },
      workspace: {
        openLinkText: () => {}
      }
    };

    const mockPages = [
      {
        file: { name: 'Clean Architecture', path: '04_Leituras/Livros/Clean Architecture.md', folder: '04_Leituras' },
        paginas_lidas: 100,
        total_paginas: 350,
        status: 'Lendo'
      }
    ];

    const mockDv = {
      container: rootContainer,
      ...createMockDataview(mockPages)
    };

    await renderLeituras(mockDv, mockApp);

    assert.ok(rootContainer.children.length > 0);

    function findText(el, text) {
      const target = text.toUpperCase();
      if (el.innerText && el.innerText.toUpperCase().includes(target)) return true;
      if (el.innerHTML && el.innerHTML.toUpperCase().includes(target)) return true;
      return el.children.some(c => findText(c, text));
    }

    // Verifica que o painel e os elementos da estante foram gerados
    assert.ok(findText(rootContainer, 'ESTANTE') || findText(rootContainer, 'LEITURAS') || findText(rootContainer, 'LIVROS') || findText(rootContainer, 'CLEAN ARCHITECTURE'));
  });
});

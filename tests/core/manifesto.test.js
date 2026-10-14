/**
 * Snoopy Vault - Testes do Manifesto de Versão e Integridade
 * Executado nativamente via `node --test`.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

describe('Manifesto de Versão e Integridade', () => {
  test('manifest.json existe, possui versao 0.9.0 e lista arquivos criticos do motor', () => {
    assert.ok(fs.existsSync('99_Meta/Snoopy/manifest.json'));
    const manifesto = JSON.parse(fs.readFileSync('99_Meta/Snoopy/manifest.json', 'utf8'));
    assert.equal(manifesto.versao, '0.9.0');
    assert.ok(manifesto.motor['99_Meta/Snoopy/core/updater.js']);
    assert.ok(manifesto.motor['.obsidian/snippets/05_Snoopy_Theme.css']);
    assert.ok(manifesto.motor['99_Meta/Templates/Tarefas/estudo-ingles.json']);
    assert.ok(manifesto.seed['99_Meta/ciclo-estudos.template.json']);
  });
});


const { test, describe } = require('node:test');
const assert = require('node:assert');
const ModaisEstudos = require('../../../99_Meta/Snoopy/subdashboards/estudos/modais.js');

describe('Subdashboard Estudos - ModaisEstudos', () => {
  test('Instanciação correta e métodos auxiliares', () => {
    let reloaded = false;
    let saved = false;

    const mockCtx = {
      app: { vault: {}, workspace: {} },
      getEstado: () => ({ cicloOrdem: ['Física', 'Química'], historicoDiario: {} }),
      salvarEstado: async () => { saved = true; },
      obterDisciplinas: () => [{ nome: 'Física', path: '03_Estudos/Física.md' }],
      onReload: () => { reloaded = true; }
    };

    const modais = new ModaisEstudos(mockCtx);
    assert.ok(modais);
    assert.strictEqual(typeof modais.abrirModalNovaMateria, 'function');
    assert.strictEqual(typeof modais.abrirModalEditarMateria, 'function');
    assert.strictEqual(typeof modais.abrirModalOrganizarCiclo, 'function');
    assert.strictEqual(typeof modais.abrirModalSessao, 'function');
    assert.strictEqual(typeof modais.abrirModalVincularPdf, 'function');
    assert.strictEqual(typeof modais.abrirModalCriarTarefaMateria, 'function');

    // Métodos utilitários internos
    assert.strictEqual(modais._padTime(5), '05');
    assert.strictEqual(modais._padTime(12), '12');
    assert.match(modais._getTodayStr(), /^\d{4}-\d{2}-\d{2}$/);
  });
});


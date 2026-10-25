const { test, describe } = require('node:test');
const assert = require('node:assert');
const PomodoroJardim = require('../../../99_Meta/Snoopy/modulos/pomodoro/pomodoro_jardim.js');

describe('Módulo Pomodoro - PomodoroJardim', () => {
  test('calcularEstagioPlanta() mapeia níveis e ícones corretamente', () => {
    assert.strictEqual(PomodoroJardim.calcularEstagioPlanta(0).pct, 0);
    assert.strictEqual(PomodoroJardim.calcularEstagioPlanta(0).badge, 'NÍVEL 1');

    assert.strictEqual(PomodoroJardim.calcularEstagioPlanta(1).pct, 20);
    assert.strictEqual(PomodoroJardim.calcularEstagioPlanta(2).pct, 40);

    const cerejeira = PomodoroJardim.calcularEstagioPlanta(4);
    assert.strictEqual(cerejeira.titulo, 'Cerejeira em Flor');
    assert.strictEqual(cerejeira.pct, 65);

    const pinheiro = PomodoroJardim.calcularEstagioPlanta(6);
    assert.strictEqual(pinheiro.titulo, 'Pinheiro Robusto');
    assert.strictEqual(pinheiro.pct, 85);

    const floresta = PomodoroJardim.calcularEstagioPlanta(8);
    assert.strictEqual(floresta.titulo, 'Floresta Mágica');
    assert.strictEqual(floresta.pct, 100);
    assert.strictEqual(floresta.badge, 'MESTRE');
    assert.strictEqual(floresta.proximoNivel, null);

    assert.deepStrictEqual(PomodoroJardim.calcularEstagioPlanta(0).proximoNivel, {
      nome: 'Plântula Ativa',
      ciclosFaltantes: 1
    });
    assert.deepStrictEqual(PomodoroJardim.calcularEstagioPlanta(4).proximoNivel, {
      nome: 'Pinheiro Robusto',
      ciclosFaltantes: 2
    });
    assert.strictEqual(typeof PomodoroJardim.calcularEstagioPlanta(0).fraseInspiradora, 'string');
    assert.ok(PomodoroJardim.calcularEstagioPlanta(0).fraseInspiradora.length > 10);
  });

  test('calcularHistorico30Dias() agrega métricas e calcula sequência de dias', () => {
    const mapa = {
      '2026-10-08': 3,
      '2026-10-09': 4,
      '2026-10-10': 2
    };

    const ref = new Date('2026-10-10T12:00:00Z');
    const res = PomodoroJardim.calcularHistorico30Dias(mapa, '2026-10-10', ref);

    assert.strictEqual(res.dias.length, 30);
    assert.strictEqual(res.totalPomos, 9);
    assert.strictEqual(res.peakPomos, 4);
    assert.strictEqual(res.streak, 3);
  });

  test('obterArvoresDoBosque() mapeia sessões do dia para árvores botânicas', () => {
    // 0 ciclos: bosque vazio
    assert.deepStrictEqual(PomodoroJardim.obterArvoresDoBosque(0), []);

    // 3 ciclos: 3 árvores cultivadas com metadados
    const sessoes = [
      { titulo: 'Ler 30 páginas', hora: '09:30', min: 25 },
      { titulo: 'Resolver bug', hora: '10:15', min: 25 },
      { titulo: 'Estudo de Rust', hora: '11:00', min: 25 }
    ];
    const arvores = PomodoroJardim.obterArvoresDoBosque(3, sessoes);
    assert.strictEqual(arvores.length, 3);
    assert.strictEqual(arvores[0].id, 1);
    assert.ok(arvores[0].label.includes('Ler 30 páginas'));
    assert.ok(arvores[0].label.includes('09:30'));
    assert.strictEqual(arvores[1].id, 2);
    assert.ok(arvores[1].label.includes('Resolver bug'));
    assert.strictEqual(arvores[2].id, 3);
    assert.ok(arvores[2].label.includes('Estudo de Rust'));
  });

  test('obterDetalhesDiaHeatmap() calcula inspeção rica do dia selecionado', () => {
    const mapa = {
      '2026-10-09': 4,
      '2026-10-08': 2
    };

    const diaComFoco = PomodoroJardim.obterDetalhesDiaHeatmap(mapa, '2026-10-09', 25, 4);
    assert.strictEqual(diaComFoco.dataStr, '2026-10-09');
    assert.strictEqual(diaComFoco.ciclos, 4);
    assert.strictEqual(diaComFoco.minutos, 100);
    assert.strictEqual(diaComFoco.atingiuMeta, true);
    assert.ok(diaComFoco.label.includes('4 ciclos'));
    assert.ok(diaComFoco.label.includes('100 min'));

    const diaVazio = PomodoroJardim.obterDetalhesDiaHeatmap(mapa, '2026-10-05', 25, 4);
    assert.strictEqual(diaVazio.ciclos, 0);
    assert.strictEqual(diaVazio.minutos, 0);
    assert.strictEqual(diaVazio.atingiuMeta, false);
    assert.ok(diaVazio.label.includes('Nenhum foco'));
  });

  test('obterGuiaEstagios() retorna catálogo completo dos 6 níveis botânicos', () => {
    const guia = PomodoroJardim.obterGuiaEstagios();
    assert.strictEqual(Array.isArray(guia), true);
    assert.strictEqual(guia.length, 6);
    assert.strictEqual(guia[0].titulo, 'Semente Plantada');
    assert.strictEqual(guia[0].ciclosMin, 0);
    assert.strictEqual(guia[3].titulo, 'Cerejeira em Flor');
    assert.strictEqual(guia[3].ciclosMin, 4);
    assert.strictEqual(guia[5].titulo, 'Floresta Mágica');
    assert.strictEqual(guia[5].ciclosMin, 8);
    assert.strictEqual(typeof guia[0].lore, 'string');
    assert.ok(guia[0].lore.length > 5);
  });
});


/**
 * Snoopy Vault - Testes Unitários de TaskParser
 * Valida extração de metadados, prazos, prioridades, períodos e hábitos.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const DateUtils = require('../../99_Meta/Snoopy/core/date_utils.js');
const TaskParser = require('../../99_Meta/Snoopy/core/task_parser.js');

describe('TaskParser - Parser Puro de Tarefas e Hábitos', () => {
  const todayStr = '2026-10-10';

  describe('parseMetadata()', () => {
    test('extrai data de vencimento no formato ISO e calcula status hoje', () => {
      const res = TaskParser.parseMetadata('Finalizar relatório 📅 2026-10-10', todayStr, DateUtils);
      assert.equal(res.cleanText, 'Finalizar relatório');
      assert.equal(res.dueStr, '2026-10-10');
      assert.equal(res.statusPrazo, 'hoje');
    });

    test('extrai data brasileira DD-MM-YYYY e calcula status atrasada', () => {
      const res = TaskParser.parseMetadata('Comprar café 📅 08-10-2026', todayStr, DateUtils);
      assert.equal(res.cleanText, 'Comprar café');
      assert.equal(res.dueStr, '2026-10-08');
      assert.equal(res.statusPrazo, 'atrasada');
    });

    test('extrai data futura e calcula status futura', () => {
      const res = TaskParser.parseMetadata('Reunião de alinhamento 📅 15-10-2026', todayStr, DateUtils);
      assert.equal(res.dueStr, '2026-10-15');
      assert.equal(res.statusPrazo, 'futura');
    });

    test('extrai prioridades alta, media e baixa', () => {
      assert.equal(TaskParser.parseMetadata('Bug crítico ⏫', todayStr, DateUtils).prio, 'alta');
      assert.equal(TaskParser.parseMetadata('Revisar PR 🔼', todayStr, DateUtils).prio, 'media');
      assert.equal(TaskParser.parseMetadata('Limpar mesa 🔽', todayStr, DateUtils).prio, 'baixa');
      assert.equal(TaskParser.parseMetadata('Sem prioridade', todayStr, DateUtils).prio, null);
    });

    test('extrai períodos do dia', () => {
      assert.equal(TaskParser.parseMetadata('Exercício 🌅 Manhã', todayStr, DateUtils).periodo, '🌅 Manhã');
      assert.equal(TaskParser.parseMetadata('Estudo ☀️ Tarde', todayStr, DateUtils).periodo, '☀️ Tarde');
      assert.equal(TaskParser.parseMetadata('Leitura 🌙 Noite', todayStr, DateUtils).periodo, '🌙 Noite');
    });

    test('extrai estimativa de pomodoros', () => {
      const res = TaskParser.parseMetadata('Escrever artigo 🍅 4', todayStr, DateUtils);
      assert.equal(res.pomosEst, '4');
      assert.equal(res.cleanText, 'Escrever artigo');
    });

    test('limpa todas as tags e retorna texto puro', () => {
      const raw = "Fazer resumo de banco \u{1F4C5} 2026-10-10 \u{23EB} \u{1F345} 2 \u{1F305} Manh\u00E3 \u{1F501} seg-sex";
      const res = TaskParser.parseMetadata(raw, todayStr, DateUtils);
      assert.equal(res.cleanText, 'Fazer resumo de banco');
      assert.equal(res.periodo, '🌅 Manhã');
    });

    test('extrai metadados quantitativos e progresso de tarefas', () => {
      const res1 = TaskParser.parseMetadata('Ler livro Clean Code [15/30 págs] 📅 2026-10-10', todayStr, DateUtils);
      assert.equal(res1.cleanText, 'Ler livro Clean Code');
      assert.ok(res1.progresso);
      assert.equal(res1.progresso.feito, 15);
      assert.equal(res1.progresso.meta, 30);
      assert.equal(res1.progresso.unidade, 'págs');
      assert.equal(res1.progresso.pct, 50);
      assert.equal(res1.progresso.rotulo, '15/30 págs');

      const res2 = TaskParser.parseMetadata('Foco estudo algoritmos [30m]', todayStr, DateUtils);
      assert.equal(res2.cleanText, 'Foco estudo algoritmos');
      assert.ok(res2.progresso);
      assert.equal(res2.progresso.feito, null);
      assert.equal(res2.progresso.meta, 30);
      assert.equal(res2.progresso.unidade, 'm');
      assert.equal(res2.progresso.rotulo, '30 m');

      const res3 = TaskParser.parseMetadata('Exercício de repetição [15x]', todayStr, DateUtils);
      assert.equal(res3.cleanText, 'Exercício de repetição');
      assert.ok(res3.progresso);
      assert.equal(res3.progresso.meta, 15);
      assert.equal(res3.progresso.unidade, 'x');
    });
  });

  describe('parseHabit()', () => {
    test('extrai hábito com período e frequência de repetição', () => {
      const res = TaskParser.parseHabit('Leitura 20 min 🌅 Manhã 🔁 Seg,Ter,Qua');
      assert.equal(res.cleanName, 'Leitura 20 min');
      assert.equal(res.periodoIcon, '🌅');
      assert.equal(res.freqTag, 'Seg,Ter,Qua');
    });

    test('extrai hábito simples sem repetição', () => {
      const res = TaskParser.parseHabit('Meditar 10 min 🌙 Noite');
      assert.equal(res.cleanName, 'Meditar 10 min');
      assert.equal(res.periodoIcon, '🌙');
      assert.equal(res.freqTag, '');
    });
  });
});

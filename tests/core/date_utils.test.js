/**
 * Snoopy Vault - Testes Unitários de DateUtils
 * Executado nativamente via `node --test`.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// Carrega o módulo compatível com CommonJS / Obsidian Function factory
const DateUtils = require('../../99_Meta/Snoopy/core/date_utils.js');

describe('DateUtils - Utilitários de Datas', () => {
  describe('somarDias()', () => {
    test('soma dias positivos corretamente', () => {
      assert.equal(DateUtils.somarDias('2026-10-10', 1), '2026-10-11');
      assert.equal(DateUtils.somarDias('2026-10-10', 5), '2026-10-15');
    });

    test('atravessa virada de mês para a frente', () => {
      assert.equal(DateUtils.somarDias('2026-10-31', 1), '2026-11-01');
    });

    test('subtrai dias e atravessa virada de mês para trás', () => {
      assert.equal(DateUtils.somarDias('2026-10-10', -10), '2026-09-30');
      assert.equal(DateUtils.somarDias('2026-03-01', -1), '2026-02-28');
    });

    test('atravessa virada de ano', () => {
      assert.equal(DateUtils.somarDias('2026-12-31', 1), '2027-01-01');
      assert.equal(DateUtils.somarDias('2026-01-01', -1), '2025-12-31');
    });
  });

  describe('formatarDDMMYYYY()', () => {
    test('formata data ISO YYYY-MM-DD para DD-MM-YYYY', () => {
      assert.equal(DateUtils.formatarDDMMYYYY('2026-10-10'), '10-10-2026');
      assert.equal(DateUtils.formatarDDMMYYYY('2026-03-05'), '05-03-2026');
    });

    test('preserva e padroniza data já brasileira com traço ou barra', () => {
      assert.equal(DateUtils.formatarDDMMYYYY('05-03-2026'), '05-03-2026');
      assert.equal(DateUtils.formatarDDMMYYYY('5/3/2026'), '05-03-2026');
      assert.equal(DateUtils.formatarDDMMYYYY('05/03/2026'), '05-03-2026');
    });

    test('retorna string vazia ou original para valores nulos ou vazios', () => {
      assert.equal(DateUtils.formatarDDMMYYYY(''), '');
      assert.equal(DateUtils.formatarDDMMYYYY(null), '');
      assert.equal(DateUtils.formatarDDMMYYYY(undefined), '');
    });
  });

  describe('normalizarParaISO()', () => {
    test('normaliza formato brasileiro DD-MM-YYYY ou DD/MM/YYYY para ISO', () => {
      assert.equal(DateUtils.normalizarParaISO('10-10-2026'), '2026-10-10');
      assert.equal(DateUtils.normalizarParaISO('05/03/2026'), '2026-03-05');
      assert.equal(DateUtils.normalizarParaISO('5/3/2026'), '2026-03-05');
    });

    test('normaliza formato ISO garantindo dois dígitos em mês e dia', () => {
      assert.equal(DateUtils.normalizarParaISO('2026-10-10'), '2026-10-10');
      assert.equal(DateUtils.normalizarParaISO('2026-3-5'), '2026-03-05');
    });

    test('retorna null para valores inválidos ou nulos', () => {
      assert.equal(DateUtils.normalizarParaISO(''), null);
      assert.equal(DateUtils.normalizarParaISO(null), null);
      assert.equal(DateUtils.normalizarParaISO('data-invalida'), null);
    });
  });
});


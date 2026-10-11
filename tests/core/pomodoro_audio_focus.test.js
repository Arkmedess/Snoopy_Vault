/**
 * Snoopy Vault - Testes de Foco e Temporização Imersiva do Pomodoro
 * Executado nativamente via `node --test`.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

describe('Pomodoro - Recursos de Foco e Feedback', () => {
  test('cálculo de offset e tempo restante no timer imersivo permanecem sincronizados', () => {
    const totalSegundos = 25 * 60;
    const restante = 15 * 60;
    const raio = 74;
    const circunferencia = 2 * Math.PI * raio; // ~464.96
    const progresso = (totalSegundos - restante) / totalSegundos;
    const offset = circunferencia * progresso;
    
    assert.equal(Math.round(circunferencia), 465);
    assert.ok(offset > 0 && offset < circunferencia);
  });

  test('formatação de tempo preserva minutos e segundos com padding zero', () => {
    const formatar = (segundos) => {
      const m = Math.floor(segundos / 60);
      const s = segundos % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    assert.equal(formatar(1500), '25:00');
    assert.equal(formatar(65), '01:05');
    assert.equal(formatar(9), '00:09');
  });
});


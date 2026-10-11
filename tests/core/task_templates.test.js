/**
 * Snoopy Vault - Testes Unitários de TaskTemplates
 * Executado nativamente via `node --test`.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const TaskTemplates = require('../../99_Meta/Snoopy/core/task_templates.js');

describe('TaskTemplates - Validação e Renderização', () => {
  const templateValido = {
    id: 'estudo-ingles',
    nome: 'Estudo de Inglês',
    tipo: 'estudo',
    pasta: '03_Estudos',
    frontmatter: { area: 'Idiomas', status: 'Ativo' },
    corpo: '# {{title}}\nData: {{date}}\n\n## Metas\n- [ ] Listening',
    vinculos: {
      kanban: { status: 'A fazer', prioridade: 'Média' },
      estudos: { adicionar_ao_ciclo: true },
      pomodoro: { tempo_foco: 25, auto_apontar: true }
    }
  };

  test('validar() aceita template estruturado corretamente', () => {
    const res = TaskTemplates.validar(templateValido);
    assert.equal(res.valido, true);
    assert.equal(res.erros.length, 0);
  });

  test('validar() rejeita template sem campos obrigatórios (nome, tipo, pasta)', () => {
    const res = TaskTemplates.validar({ id: 'invalido' });
    assert.equal(res.valido, false);
    assert.ok(res.erros.some(e => e.includes('nome')));
    assert.ok(res.erros.some(e => e.includes('pasta')));
  });

  test('renderizar() interpola variáveis no corpo e gera markdown formatado com frontmatter', () => {
    const res = TaskTemplates.renderizar(templateValido, {
      title: 'Gramática Básica',
      date: '2026-10-11'
    });
    assert.ok(res.conteudoMarkdown.includes('title: "Gramática Básica"'));
    assert.ok(res.conteudoMarkdown.includes('# Gramática Básica'));
    assert.ok(res.conteudoMarkdown.includes('Data: 2026-10-11'));
    assert.equal(res.caminhoSugerido, '03_Estudos/Gramática Básica.md');
  });

  test('extrairVinculos() retorna mapa normalizado com defaults seguros', () => {
    const vinculos = TaskTemplates.extrairVinculos(templateValido);
    assert.equal(vinculos.pomodoro.tempo_foco, 25);
    assert.equal(vinculos.kanban.status, 'A fazer');
    assert.equal(vinculos.estudos.adicionar_ao_ciclo, true);
  });
});


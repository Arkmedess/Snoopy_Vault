import test from 'node:test';
import assert from 'node:assert/strict';
import PomodoroPlaylist from '../../../99_Meta/Snoopy/modulos/pomodoro/pomodoro_playlist.js';

test('PomodoroPlaylist - Gerenciamento de Fila de Foco e Ciclos', async (t) => {
  await t.test('inicializa vazia ou com lista fornecida', () => {
    const playlist = new PomodoroPlaylist();
    assert.equal(playlist.obterTamanho(), 0);
    assert.equal(playlist.obterFaixaAtual(), null);
  });

  await t.test('adiciona faixas à fila e define a primeira como atual', () => {
    const playlist = new PomodoroPlaylist();
    const f1 = playlist.adicionarFaixa({ titulo: 'Ler 30 páginas', pomosTotal: 2 });
    assert.equal(playlist.obterTamanho(), 1);
    assert.equal(playlist.obterFaixaAtual().titulo, 'Ler 30 páginas');
    assert.equal(playlist.obterFaixaAtual().pomosTotal, 2);
    assert.equal(playlist.obterFaixaAtual().pomosConcluidos, 0);

    const f2 = playlist.adicionarFaixa({ titulo: 'Exercício de Algoritmos', pomosTotal: 1 });
    assert.equal(playlist.obterTamanho(), 2);
    // Faixa atual ainda é a primeira
    assert.equal(playlist.obterFaixaAtual().titulo, 'Ler 30 páginas');
    // Próximas faixas
    const proximas = playlist.obterProximas();
    assert.equal(proximas.length, 1);
    assert.equal(proximas[0].titulo, 'Exercício de Algoritmos');
  });

  await t.test('avancar() e retroceder() navegam na playlist', () => {
    const playlist = new PomodoroPlaylist();
    playlist.adicionarFaixa({ titulo: 'Faixa 1' });
    playlist.adicionarFaixa({ titulo: 'Faixa 2' });
    playlist.adicionarFaixa({ titulo: 'Faixa 3' });

    assert.equal(playlist.obterFaixaAtual().titulo, 'Faixa 1');
    const prox = playlist.avancar();
    assert.equal(prox.titulo, 'Faixa 2');
    assert.equal(playlist.obterFaixaAtual().titulo, 'Faixa 2');

    const prox2 = playlist.avancar();
    assert.equal(prox2.titulo, 'Faixa 3');

    // Ao tentar avançar além do fim
    const fim = playlist.avancar();
    assert.equal(fim, null);
    assert.equal(playlist.obterFaixaAtual().titulo, 'Faixa 3');

    // Retroceder
    const ant = playlist.retroceder();
    assert.equal(ant.titulo, 'Faixa 2');
  });

  await t.test('concluirCicloNaFaixaAtual() incrementa pomodoros e avança automaticamente quando atinge o total', () => {
    const playlist = new PomodoroPlaylist();
    playlist.adicionarFaixa({ titulo: 'Tarefa A', pomosTotal: 2 });
    playlist.adicionarFaixa({ titulo: 'Tarefa B', pomosTotal: 1 });

    const resultado1 = playlist.concluirCicloNaFaixaAtual();
    assert.equal(resultado1.atingiuTotal, false);
    assert.equal(playlist.obterFaixaAtual().pomosConcluidos, 1);
    assert.equal(playlist.obterFaixaAtual().titulo, 'Tarefa A');

    const resultado2 = playlist.concluirCicloNaFaixaAtual();
    assert.equal(resultado2.atingiuTotal, true);
    // Deve ter avançado para Tarefa B
    assert.equal(playlist.obterFaixaAtual().titulo, 'Tarefa B');
  });

  await t.test('removerFaixa() remove pelo id e ajusta índice', () => {
    const playlist = new PomodoroPlaylist();
    const f1 = playlist.adicionarFaixa({ titulo: 'Tarefa 1' });
    const f2 = playlist.adicionarFaixa({ titulo: 'Tarefa 2' });

    playlist.removerFaixa(f1.id);
    assert.equal(playlist.obterTamanho(), 1);
    assert.equal(playlist.obterFaixaAtual().titulo, 'Tarefa 2');
  });

  await t.test('serializar() e deserializar() mantêm a integridade da playlist', () => {
    const playlist = new PomodoroPlaylist();
    playlist.adicionarFaixa({ titulo: 'Tarefa X', pomosTotal: 3 });
    playlist.adicionarFaixa({ titulo: 'Tarefa Y', pomosTotal: 1 });
    playlist.avancar();

    const dados = playlist.serializar();
    assert.equal(dados.currentIndex, 1);
    assert.equal(dados.tracks.length, 2);

    const novaPlaylist = new PomodoroPlaylist();
    novaPlaylist.deserializar(dados);
    assert.equal(novaPlaylist.obterTamanho(), 2);
    assert.equal(novaPlaylist.obterFaixaAtual().titulo, 'Tarefa Y');
  });
});

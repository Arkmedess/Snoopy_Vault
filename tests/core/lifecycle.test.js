import { test } from 'node:test';
import assert from 'node:assert/strict';
import Lifecycle from '../../99_Meta/Snoopy/core/lifecycle.js';

test('Lifecycle - deve registrar e executar callbacks de descarte no escopo', () => {
  Lifecycle.dispose('teste');
  let limpo = false;

  Lifecycle.onDispose('teste', () => {
    limpo = true;
  });

  assert.equal(Lifecycle.contagem('teste'), 1);
  Lifecycle.dispose('teste');

  assert.equal(limpo, true);
  assert.equal(Lifecycle.contagem('teste'), 0);
});

test('Lifecycle - permite cancelar registro individual antes do dispose', () => {
  Lifecycle.dispose('teste');
  let chamado = false;

  const cancel = Lifecycle.onDispose('teste', () => {
    chamado = true;
  });

  cancel();
  Lifecycle.dispose('teste');

  assert.equal(chamado, false);
});

test('Lifecycle - tolera erros em funções de descarte individuais', () => {
  Lifecycle.dispose('teste');
  let proximoChamado = false;

  Lifecycle.onDispose('teste', () => {
    throw new Error('Falha simulada');
  });
  Lifecycle.onDispose('teste', () => {
    proximoChamado = true;
  });

  Lifecycle.dispose('teste');
  assert.equal(proximoChamado, true);
  assert.equal(Lifecycle.contagem('teste'), 0);
});


import { test } from 'node:test';
import assert from 'node:assert/strict';
import Lifecycle from '../../../99_Meta/Snoopy/core/lifecycle.js';

test('Tarefas Lifecycle - deve registrar e desregistrar ouvinte do barramento de eventos', () => {
  Lifecycle.dispose('home');
  let ativo = true;

  const cancel = () => { ativo = false; };
  Lifecycle.onDispose('home', cancel);

  assert.equal(ativo, true);
  Lifecycle.dispose('home');
  assert.equal(ativo, false);
});


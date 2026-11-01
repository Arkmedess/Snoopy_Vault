/**
 * Snoopy Vault - Milestone M3 Empirical Stress Test Suite (Challenger 2)
 *
 * Foco: Teste adversarial da máquina de estados, controles e integração com timer:
 * 1. Concorrência e spam de 100 chamadas rápidas (start/pause/stop/switch track).
 * 2. Limites de volume e clamping estrito [0.0, 1.0] sob entradas anômalas (negativas, oversized, NaN, strings, null, undefined).
 * 3. Falha e corrupção de localStorage (JSON inválido, quota exceeded, storage desabilitado).
 * 4. Ciclo de vida e sincronização automática (auto-sync) com eventos do temporizador Pomodoro.
 *
 * Executado nativamente via `node --test tests/core/challenger_stress_m3_controls.test.js`.
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  MockAudioContext,
  createMockLocalStorage,
  criarMockApp
} = require('../e2e/helpers/e2e_utils.js');

const { createMockEl } = require('../helpers/test_utils.js');

const AUDIO_MODULE_PATH = path.resolve(__dirname, '../../99_Meta/Snoopy/core/pomodoro_audio.js');

function carregarMotorAudio() {
  delete require.cache[require.resolve(AUDIO_MODULE_PATH)];
  return require(AUDIO_MODULE_PATH);
}

describe('Challenger M3 - Empirical Stress Test Suite: State Machine, Controls & Timer Sync', () => {
  let PomodoroAudio;
  let mockCtx;
  let mockStorage;

  beforeEach(() => {
    PomodoroAudio = carregarMotorAudio();
    mockCtx = new MockAudioContext();
    mockStorage = createMockLocalStorage();
    PomodoroAudio.conectarContexto(mockCtx);
    PomodoroAudio.conectarStorage(mockStorage);
  });

  // =========================================================================
  // 1. Concorrência e Spam de 100 Chamadas Rápidas
  // =========================================================================
  describe('1. Concorrência e Spam de 100 Chamadas Rápidas', () => {
    test('100 chamadas sequenciais rápidas alternando start/pause/stop/switch não geram exceções ou race condition', async () => {
      await PomodoroAudio.iniciar();

      const faixas = ['white_noise', 'brown_noise', 'pink_noise', 'procedural_rain', 'binaural_alpha', 'binaural_beta'];
      const operacoes = ['tocar', 'pausar', 'parar', 'tocarFaixa'];

      assert.doesNotThrow(() => {
        for (let i = 0; i < 100; i++) {
          const op = operacoes[i % operacoes.length];
          const faixa = faixas[i % faixas.length];
          if (op === 'tocar') {
            PomodoroAudio.tocar(faixa);
          } else if (op === 'tocarFaixa') {
            PomodoroAudio.tocarFaixa(faixa);
          } else if (op === 'pausar') {
            PomodoroAudio.pausar();
          } else if (op === 'parar') {
            PomodoroAudio.parar();
          }
        }
      });

      // Após parar, estado deve estar consistente e limpo
      PomodoroAudio.parar();
      const estado = PomodoroAudio.obterEstado();
      assert.strictEqual(estado.isPlaying, false);
      assert.strictEqual(PomodoroAudio._activeSourceNode, null);
      assert.strictEqual(PomodoroAudio._activeOscillators.length, 0);
      assert.strictEqual(PomodoroAudio._activePanners.length, 0);
    });

    test('100 chamadas assíncronas concorrentes (Promise.all) não geram unhandled rejections', async () => {
      const promises = [];
      const faixas = ['white_noise', 'brown_noise', 'pink_noise', 'procedural_rain', 'binaural_alpha', 'binaural_beta'];

      for (let i = 0; i < 100; i++) {
        const faixa = faixas[i % faixas.length];
        promises.push((async () => {
          if (i % 3 === 0) {
            await PomodoroAudio.iniciar();
            PomodoroAudio.tocar(faixa);
          } else if (i % 3 === 1) {
            PomodoroAudio.pausar();
          } else {
            PomodoroAudio.tocarFaixa(faixa);
          }
        })());
      }

      await assert.doesNotReject(async () => {
        await Promise.all(promises);
      });

      // Finaliza e verifica desconexão
      PomodoroAudio.parar();
      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, false);
      assert.strictEqual(PomodoroAudio._activeSourceNode, null);
      assert.strictEqual(PomodoroAudio._activeOscillators.length, 0);
      assert.strictEqual(PomodoroAudio._activePanners.length, 0);
    });

    test('Troca rápida contínua entre BufferSource e Osciladores desconecta nós anteriores sem acúmulo de nós ativos', async () => {
      await PomodoroAudio.iniciar();

      for (let i = 0; i < 20; i++) {
        // Toca faixa de buffer
        PomodoroAudio.tocar('white_noise');
        assert.ok(PomodoroAudio._activeSourceNode !== null);
        assert.strictEqual(PomodoroAudio._activeOscillators.length, 0);

        // Troca imediatamente para oscilador binaural
        PomodoroAudio.tocar('binaural_alpha');
        assert.strictEqual(PomodoroAudio._activeSourceNode, null);
        assert.strictEqual(PomodoroAudio._activeOscillators.length, 2);

        // Troca para outro buffer
        PomodoroAudio.tocar('procedural_rain');
        assert.ok(PomodoroAudio._activeSourceNode !== null);
        assert.strictEqual(PomodoroAudio._activeOscillators.length, 0);
      }

      // Verifica que todos os nós anteriores criados foram parados e desconectados
      const bufferNodes = mockCtx.nodesCreated.filter(n => n.type === 'bufferSource');
      // Todos menos o último ativo devem estar desconectados
      for (let i = 0; i < bufferNodes.length - 1; i++) {
        assert.strictEqual(bufferNodes[i]._target, null, `BufferNode ${i} deve estar desconectado`);
        assert.strictEqual(bufferNodes[i]._stopped, true, `BufferNode ${i} deve ter sido parado`);
      }

      // Todos os osciladores anteriores devem estar parados e desconectados
      const oscNodes = mockCtx.nodesCreated.filter(n => n.type === 'sine');
      for (const osc of oscNodes) {
        assert.strictEqual(osc._target, null, 'Osciladores devem estar desconectados');
        assert.strictEqual(osc._stopped, true, 'Osciladores devem estar parados');
      }

      PomodoroAudio.destroy();
      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, false);
      assert.strictEqual(PomodoroAudio._activeSourceNode, null);
      assert.strictEqual(PomodoroAudio._activeOscillators.length, 0);
      assert.strictEqual(PomodoroAudio._activePanners.length, 0);
    });
  });

  // =========================================================================
  // 2. Limites de Volume e Clamping Estrito [0.0, 1.0]
  // =========================================================================
  describe('2. Limites de Volume e Clamping Estrito [0.0, 1.0]', () => {
    test('ajustarVolume() com valores negativos é limitado estritamente a 0.0', () => {
      const inputsNegativos = [-0.0001, -0.5, -1.0, -100, -Infinity];
      for (const val of inputsNegativos) {
        PomodoroAudio.ajustarVolume(val);
        const est = PomodoroAudio.obterEstado();
        assert.strictEqual(est.volume, 0.0, `Falha no clamping para ${val}`);
        assert.ok(est.volume >= 0.0 && est.volume <= 1.0);
      }
    });

    test('ajustarVolume() com valores superiores a 1.0 é limitado estritamente a 1.0', () => {
      const inputsSuperiores = [1.0001, 1.5, 5.0, 100, Infinity];
      for (const val of inputsSuperiores) {
        PomodoroAudio.ajustarVolume(val);
        const est = PomodoroAudio.obterEstado();
        assert.strictEqual(est.volume, 1.0, `Falha no clamping para ${val}`);
        assert.ok(est.volume >= 0.0 && est.volume <= 1.0);
      }
    });

    test('ajustarVolume() com valores não-numéricos (NaN, string, null, undefined) preserva limites', () => {
      // NaN -> padrão 0.5
      PomodoroAudio.ajustarVolume(NaN);
      assert.strictEqual(PomodoroAudio.obterEstado().volume, 0.5);

      // 'abc' -> NaN -> padrão 0.5
      PomodoroAudio.ajustarVolume('abc');
      assert.strictEqual(PomodoroAudio.obterEstado().volume, 0.5);

      // undefined -> NaN -> padrão 0.5
      PomodoroAudio.ajustarVolume(undefined);
      assert.strictEqual(PomodoroAudio.obterEstado().volume, 0.5);

      // null -> Number(null) é 0 -> clamped para 0.0
      PomodoroAudio.ajustarVolume(null);
      assert.strictEqual(PomodoroAudio.obterEstado().volume, 0.0);

      // String numérica válida -> '0.75' -> 0.75
      PomodoroAudio.ajustarVolume('0.75');
      assert.strictEqual(PomodoroAudio.obterEstado().volume, 0.75);

      // Objetos e arrays
      PomodoroAudio.ajustarVolume({});
      assert.strictEqual(PomodoroAudio.obterEstado().volume, 0.5);

      PomodoroAudio.ajustarVolume([0.3]);
      assert.strictEqual(PomodoroAudio.obterEstado().volume, 0.3);

      // Invariante: volume sempre no intervalo [0.0, 1.0]
      const estado = PomodoroAudio.obterEstado();
      assert.ok(estado.volume >= 0.0 && estado.volume <= 1.0);
    });

    test('MasterGain reflete estritamente o valor clamped ou zero quando mutado', async () => {
      await PomodoroAudio.iniciar();

      PomodoroAudio.ajustarVolume(5.0);
      assert.strictEqual(PomodoroAudio._masterGain.gain.value, 1.0);

      PomodoroAudio.ajustarVolume(-2.0);
      assert.strictEqual(PomodoroAudio._masterGain.gain.value, 0.0);

      PomodoroAudio.ajustarVolume(0.65);
      assert.strictEqual(PomodoroAudio._masterGain.gain.value, 0.65);

      PomodoroAudio.mutar(true);
      assert.strictEqual(PomodoroAudio._masterGain.gain.value, 0.0);

      PomodoroAudio.mutar(false);
      assert.strictEqual(PomodoroAudio._masterGain.gain.value, 0.65);
    });
  });

  // =========================================================================
  // 3. Falha e Corrupção de LocalStorage
  // =========================================================================
  describe('3. Falha e Corrupção de LocalStorage', () => {
    test('Valores corrompidos no localStorage são higienizados na inicialização', () => {
      mockStorage.setItem('snoopy_pomodoro_audio_volume', 'invalid_volume_string');
      mockStorage.setItem('snoopy_pomodoro_audio_muted', 'not_a_boolean');
      mockStorage.setItem('snoopy_pomodoro_audio_autosync', 'invalid_sync');
      mockStorage.setItem('snoopy_pomodoro_audio_track', 'non_existent_track_xyz');

      const NovoAudio = carregarMotorAudio();
      NovoAudio.conectarContexto(new MockAudioContext());
      NovoAudio.conectarStorage(mockStorage);

      const estado = NovoAudio.obterEstado();
      assert.strictEqual(estado.volume, 0.5, 'Volume corrompido deve cair no padrão 0.5');
      assert.strictEqual(estado.isMuted, false, 'Muted não-true deve ser false');
      assert.strictEqual(estado.autoSync, true, 'Autosync não-false deve ser true');
      // Faixa desconhecida é mantida normalizada como string segura
      assert.strictEqual(typeof estado.currentTrack, 'string');
    });

    test('Valores extremos no localStorage são limitados a [0.0, 1.0] na inicialização', () => {
      mockStorage.setItem('snoopy_pomodoro_audio_volume', '999.0');
      const AudioAlto = carregarMotorAudio();
      AudioAlto.conectarContexto(new MockAudioContext());
      AudioAlto.conectarStorage(mockStorage);
      assert.strictEqual(AudioAlto.obterEstado().volume, 1.0);

      mockStorage.setItem('snoopy_pomodoro_audio_volume', '-50.0');
      const AudioBaixo = carregarMotorAudio();
      AudioBaixo.conectarContexto(new MockAudioContext());
      AudioBaixo.conectarStorage(mockStorage);
      assert.strictEqual(AudioBaixo.obterEstado().volume, 0.0);
    });

    test('Fallback seguro para memória quando nem localStorage nem window estão definidos', () => {
      const AudioPuro = carregarMotorAudio();
      // Não conecta storage injetado
      const store = AudioPuro._getStorage();
      assert.ok(store, 'Deve retornar implementação de storage');
      assert.strictEqual(typeof store.getItem, 'function');
      assert.strictEqual(typeof store.setItem, 'function');

      store.setItem('teste_chave', 'teste_valor');
      assert.strictEqual(store.getItem('teste_chave'), 'teste_valor');
    });

    test('Corrupção de JSON em arquivos do Vault em obterFaixasDisponiveis() não causa quebra', async () => {
      const mockApp = {
        vault: {
          getAbstractFileByPath: (p) => ({ path: p }),
          read: async () => '<<< INVALID CORRUPTED JSON >>>'
        }
      };

      const faixas = await PomodoroAudio.obterFaixasDisponiveis(mockApp);
      assert.ok(Array.isArray(faixas));
      assert.ok(faixas.length >= 1, 'Deve retornar ao menos as faixas gratuitas padrão');
      assert.ok(faixas.some(f => f.trackId === 'white_noise' || f.id === 'audio-white-noise'));
    });

    test('Comportamento sob QuotaExceededError ou SecurityError no storage', () => {
      const throwingStorage = {
        getItem: () => { throw new Error('SecurityError: Access is denied'); },
        setItem: () => { throw new Error('QuotaExceededError: Storage quota exceeded'); }
      };

      const AudioComFalha = carregarMotorAudio();
      AudioComFalha.conectarContexto(new MockAudioContext());
      
      let errorOnLoad = null;
      try {
        AudioComFalha.conectarStorage(throwingStorage);
      } catch (err) {
        errorOnLoad = err;
      }

      let errorOnSet = null;
      try {
        AudioComFalha.ajustarVolume(0.8);
      } catch (err) {
        errorOnSet = err;
      }

      let errorOnPlay = null;
      try {
        AudioComFalha.tocar('white_noise');
      } catch (err) {
        errorOnPlay = err;
      }

      // Se storage lançar erro, as chamadas sem try/catch lançam exceção
      assert.ok(errorOnLoad !== null, 'Storage getItem lançando deve disparar erro ou ser tratado');
      assert.ok(errorOnSet !== null, 'Storage setItem lançando QuotaExceeded deve disparar erro ou ser tratado');
      assert.ok(errorOnPlay !== null, 'Storage setItem ao tocar deve disparar erro ou ser tratado');
    });
  });

  // =========================================================================
  // 4. Ciclo de Vida e Sincronização Automática (Auto-Sync) com o Timer
  // =========================================================================
  describe('4. Ciclo de Vida e Sincronização Automática (Auto-Sync) com o Timer', () => {
    test('definirAutoSync() e obterAutoSync() persistem e refletem estado corretamente', () => {
      PomodoroAudio.definirAutoSync(false);
      assert.strictEqual(PomodoroAudio.obterAutoSync(), false);
      assert.strictEqual(mockStorage.getItem('snoopy_pomodoro_audio_autosync'), 'false');

      PomodoroAudio.definirAutoSync(true);
      assert.strictEqual(PomodoroAudio.obterAutoSync(), true);
      assert.strictEqual(mockStorage.getItem('snoopy_pomodoro_audio_autosync'), 'true');
    });

    test('Simulação de fluxo completo do Cockpit Pomodoro com auto-sync ativo', async () => {
      await PomodoroAudio.iniciar();
      PomodoroAudio.definirAutoSync(true);

      let timerMode = 'foco';
      let isRunning = false;

      // Manipulador onRunningChange fiel ao 02_snoopy_cockpit_pomodoro.js
      const onRunningChange = async ({ isRunning: running }) => {
        isRunning = running;
        if (PomodoroAudio && PomodoroAudio.obterAutoSync()) {
          if (isRunning && timerMode === 'foco') {
            await PomodoroAudio.iniciar();
            PomodoroAudio.tocar();
          } else {
            PomodoroAudio.pausar();
          }
        }
      };

      // Manipulador onComplete fiel ao 02_snoopy_cockpit_pomodoro.js
      const onComplete = async ({ mode }) => {
        if (PomodoroAudio && PomodoroAudio.obterAutoSync()) {
          PomodoroAudio.parar();
        }
        if (mode === 'foco') {
          timerMode = 'pausa';
          await onRunningChange({ isRunning: true }); // timer inicia pausa
        } else {
          timerMode = 'foco';
          await onRunningChange({ isRunning: true }); // timer inicia foco
        }
      };

      // 1. Usuário inicia timer de foco
      await onRunningChange({ isRunning: true });
      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, true, 'Deve tocar durante foco ativo');

      // 2. Usuário pausa timer
      await onRunningChange({ isRunning: false });
      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, false, 'Deve pausar quando timer pausar');

      // 3. Usuário retoma foco
      await onRunningChange({ isRunning: true });
      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, true, 'Deve retomar ao despausar foco');

      // 4. Timer conclui ciclo de foco e transita automaticamente para pausa
      await onComplete({ mode: 'foco' });
      assert.strictEqual(timerMode, 'pausa');
      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, false, 'NÃO deve tocar som de foco durante a pausa');

      // 5. Timer de pausa conclui e transita de volta para foco
      await onComplete({ mode: 'pausa' });
      assert.strictEqual(timerMode, 'foco');
      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, true, 'Deve voltar a tocar som ao iniciar novo foco');

      // 6. Reset do timer para áudio
      PomodoroAudio.parar();
      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, false);
    });

    test('Quando auto-sync está desativado, eventos do timer não alteram reprodução do áudio', async () => {
      await PomodoroAudio.iniciar();
      PomodoroAudio.definirAutoSync(false);

      let timerMode = 'foco';
      let isRunning = false;

      const onRunningChange = async ({ isRunning: running }) => {
        isRunning = running;
        if (PomodoroAudio && PomodoroAudio.obterAutoSync()) {
          if (isRunning && timerMode === 'foco') {
            await PomodoroAudio.iniciar();
            PomodoroAudio.tocar();
          } else {
            PomodoroAudio.pausar();
          }
        }
      };

      // Timer inicia foco, mas auto-sync está desligado -> áudio permanece parado
      await onRunningChange({ isRunning: true });
      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, false);

      // Usuário decide dar play manual no áudio
      PomodoroAudio.tocar('pink_noise');
      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, true);

      // Timer pausa -> como auto-sync está desligado, áudio manual não é interrompido
      await onRunningChange({ isRunning: false });
      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, true);

      // Limpeza
      PomodoroAudio.parar();
    });

    test('Descarte de ciclo de vida (destroy) limpa nós e fecha contexto', async () => {
      await PomodoroAudio.iniciar();
      PomodoroAudio.tocar('binaural_beta');
      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, true);

      PomodoroAudio.destroy();
      assert.strictEqual(PomodoroAudio.obterEstado().isPlaying, false);
      assert.strictEqual(mockCtx.state, 'closed');
      assert.strictEqual(PomodoroAudio._activeSourceNode, null);
      assert.strictEqual(PomodoroAudio._activeOscillators.length, 0);
    });
  });

  // =========================================================================
  // 5. Interação com Elementos DOM do Audio Dock no Cockpit Pomodoro
  // =========================================================================
  describe('5. Interação com Elementos DOM do Audio Dock no Cockpit Pomodoro', () => {
    const fs = require('node:fs');
    const { carregarModulo } = require('../helpers/test_utils.js');
    const UIKit = require('../../99_Meta/Snoopy/core/ui_kit.js');
    const moduloPomodoro = carregarModulo('99_Meta/Snoopy/modulos/02_snoopy_cockpit_pomodoro.js');

    test('Slider de volume no DOM atualiza label percentual e ganho no PomodoroAudio', async () => {
      const root = createMockEl('div');
      globalThis.__testAudioInstance = PomodoroAudio;

      const mockApp = {
        vault: {
          getAbstractFileByPath: (relPath) => {
            const fullPath = path.resolve(__dirname, '../../', relPath);
            return fs.existsSync(fullPath) ? { path: relPath } : null;
          },
          read: async (file) => {
            if (file.path && file.path.includes('pomodoro_audio.js')) {
              return 'return globalThis.__testAudioInstance;';
            }
            const fullPath = path.resolve(__dirname, '../../', file.path);
            return fs.readFileSync(fullPath, 'utf8');
          }
        }
      };

      const mockCtxPom = {
        root,
        app: mockApp,
        now: new Date(2026, 9, 24),
        padTime: (n) => String(n).padStart(2, '0'),
        todayStr: '2026-10-24',
        dailyPath: '01_Inbox/Diário/2026-10-24.md',
        garantirNotaDiaria: async () => ({ path: '01_Inbox/Diário/2026-10-24.md' }),
        mapaFoco: { '2026-10-24': 3 },
        completedCyclesToday: 3,
        events: { on: () => () => {}, emit: () => {} },
        config: { tempo_foco: 25, tempo_pausa_curta: 5, meta_ciclos_diarios: 4 },
        UIKit,
        renderIcon: (el, name, opts) => UIKit.renderIcon(el, name, opts),
        ModalFactory: require('../../99_Meta/Snoopy/core/modal_factory.js'),
        VaultStore: require('../../99_Meta/Snoopy/core/vault_store.js')
      };

      await moduloPomodoro.render(mockCtxPom);

      const audioDock = root.querySelector('.snoopy-audio-dock');
      assert.ok(audioDock, 'Audio Dock deve existir no DOM');

      const volSlider = audioDock.querySelector('.snoopy-volume-slider');
      const volLabel = audioDock.querySelector('.snoopy-audio-vol-txt');
      const btnToggle = audioDock.querySelector('.snoopy-audio-toggle');
      const syncLabel = audioDock.querySelector('.snoopy-audio-sync-label');
      const syncCb = syncLabel ? syncLabel.querySelector('input') : null;

      assert.ok(volSlider, 'Slider deve existir');
      assert.ok(volLabel, 'Label de volume deve existir');
      assert.ok(btnToggle, 'Botão toggle deve existir');
      assert.ok(syncLabel, 'Label de auto-sync deve existir');
      assert.ok(syncCb, 'Checkbox de auto-sync deve existir');

      // Teste de alteração de volume via evento input do slider
      volSlider.value = '75';
      volSlider.dispatchEvent('input', { target: volSlider });
      assert.strictEqual(volLabel.textContent, '75%');
      assert.strictEqual(volSlider.getAttribute('title'), 'Volume: 75%');

      // Teste de alteração de auto-sync
      syncCb.checked = false;
      syncCb.dispatchEvent('change', { target: syncCb });
      assert.strictEqual(PomodoroAudio.obterAutoSync(), false);
    });
  });
});

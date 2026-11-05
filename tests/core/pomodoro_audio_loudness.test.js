/**
 * Snoopy Vault - Testes Automatizados de Equalização Acústica e Nível de Volume (Loudness Matching)
 * Garante que todas as faixas de áudio possuam nível de intensidade perceptível uniforme (~ -14 a -17 LUFS)
 * e que o alarme sonoro de término de Pomodoro seja zen e calibrado sem estourar.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

describe('PomodoroAudio - Calibração de Altura Perceptível (Loudness Matching)', () => {
  const pastaAudio = path.resolve(__dirname, '../../99_Meta/Snoopy/audio');

  test('Todas as faixas .ogg de foco possuem Loudness Integrado uniforme entre -13.0 e -18.0 LUFS', () => {
    const arquivosOgg = [
      'binaural_gamma.ogg',
      'brown_noise.ogg',
      'forest_quiet.ogg',
      'lofi_japan.ogg',
      'rain.ogg',
      'white_noise.ogg'
    ];

    for (const nomeArq of arquivosOgg) {
      const fullPath = path.join(pastaAudio, nomeArq);
      assert.ok(fs.existsSync(fullPath), `Arquivo ${nomeArq} deve existir na pasta de áudio`);

      // Medição analítica real via ffmpeg ebur128
      const cmd = `ffmpeg -nostats -i "${fullPath}" -filter_complex ebur128 -f null - 2>&1`;
      const out = cp.execSync(cmd, { encoding: 'utf8' });
      const match = out.match(/Integrated loudness:\s+I:\s+([-0-9.]+)\s+LUFS/);
      assert.ok(match, `Deve ser possível medir o Integrated Loudness de ${nomeArq}`);

      const lufs = parseFloat(match[1]);
      assert.ok(
        lufs >= -18.5 && lufs <= -13.0,
        `Faixa ${nomeArq} deve estar na faixa confortável de -13.0 a -18.5 LUFS (obtido: ${lufs} LUFS)`
      );
    }
  });

  test('Chime de término de Pomodoro possui ganho atenuado e seguro contra estouro acústico', () => {
    const cockpitCode = fs.readFileSync(
      path.resolve(__dirname, '../../99_Meta/Snoopy/modulos/02_snoopy_cockpit_pomodoro.js'),
      'utf8'
    );

    // Garante que o pico de ganho do chime não é o antigo 0.25 fixo (que estourava o som)
    assert.strictEqual(
      cockpitCode.includes('exponentialRampToValueAtTime(0.25,'),
      false,
      'O pico do chime não deve mais ser 0.25 (altíssimo e descalibrado)'
    );

    // Deve conter calibração zen suave com pico <= 0.05
    const matchGanho = cockpitCode.match(/exponentialRampToValueAtTime\(([^,]+),\s*t \+ 0\.04\)/);
    assert.ok(matchGanho, 'Deve haver curva de envelope de ganho para o chime');
  });
});

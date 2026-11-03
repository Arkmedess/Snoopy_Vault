/**
 * Ferramenta de Release e Geração do Manifesto Oficial do Snoopy Vault
 * Calcula os hashes SHA-256 de todos os arquivos da zona Motor e Seed.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function calcularHash(caminhoArquivo) {
  const buffer = fs.readFileSync(caminhoArquivo);
  return 'sha256:' + crypto.createHash('sha256').update(buffer).digest('hex');
}

function listarArquivosRecursivo(dir, filtro = () => true) {
  let arquivos = [];
  if (!fs.existsSync(dir)) return arquivos;
  const entradas = fs.readdirSync(dir, { withFileTypes: true });
  for (const entrada of entradas) {
    const fullPath = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      arquivos = arquivos.concat(listarArquivosRecursivo(fullPath, filtro));
    } else if (entrada.isFile() && filtro(fullPath)) {
      arquivos.push(fullPath.replace(/\\/g, '/'));
    }
  }
  return arquivos;
}

const versao = '0.9.1';
const changelog = [
  'Popup de conclusão do ciclo Pomodoro (+5 min extras de foco ou início imediato de pausa com timer de 30s)',
  'Dock de áudio com restauração completa de links e reprodução de vídeos do YouTube',
  'Design tokens com alto contraste para modo Claro (Light), preservando legibilidade nos Hábitos e Heatmap',
  'Toggle de ambiente e partículas (ANIM: ON/OFF) com propagação de background para todo o workspace do Obsidian',
  'Persistência híbrida e reconciliação confiável de moedas, temas e itens da loja ao fechar e reabrir o app',
  'Motor de verificação de atualizações (SHA-256) integrado nas Configurações com download atômico e backup',
  'Notificação inteligente de atualização disponível na Home e modal pós-atualização com changelog e link para o GitHub'
];


// Zona Motor
const arquivosMotor = [
  ...listarArquivosRecursivo('99_Meta/Snoopy', p => !p.endsWith('manifest.json') && !p.includes('.install.json') && !p.includes('.backups')),
  ...listarArquivosRecursivo('99_Meta/Templates/Tarefas', p => p.endsWith('.json')),
  ...listarArquivosRecursivo('99_Meta/Templates', p => p.endsWith('.md')),
  '.obsidian/snippets/00_Snoopy_Fonts.css',
  '.obsidian/snippets/05_Snoopy_Theme.css'
];

// Zona Seed
const arquivosSeed = [
  '00_Home/Home.md',
  '00_Home/Guia do Usuário.md',
  '03_Estudos/Painel de Estudos.md',
  '04_Leituras/Painel de Leituras.md',
  '99_Meta/ciclo-estudos.template.json'
];

const mapaMotor = {};
for (const f of arquivosMotor.sort()) {
  if (fs.existsSync(f)) {
    mapaMotor[f] = calcularHash(f);
  }
}

const mapaSeed = {};
for (const f of arquivosSeed.sort()) {
  if (fs.existsSync(f)) {
    mapaSeed[f] = calcularHash(f);
  }
}

const manifesto = {
  versao,
  repositorio: 'Arkmedess/Snoopy_Vault',
  dataGeracao: new Date().toISOString(),
  changelog,
  motor: mapaMotor,
  seed: mapaSeed
};

fs.writeFileSync('99_Meta/Snoopy/manifest.json', JSON.stringify(manifesto, null, 2) + '\n');
process.stdout.write(`Manifesto v${versao} gerado com sucesso em 99_Meta/Snoopy/manifest.json (${Object.keys(mapaMotor).length} arquivos de motor, ${Object.keys(mapaSeed).length} seeds).\n`);

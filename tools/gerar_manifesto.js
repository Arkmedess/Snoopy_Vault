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

const versao = '0.9.0';
const changelog = [
  'Sistema de fontes embutidas offline-first (Inter, JetBrains Mono e Source Serif 4)',
  'UIKit v2 com catálogo canônico de 87 ícones Lucide SVG, componentes de Estado Vazio e Pluralização',
  'Anatomia de cabeçalho unificada e padronização dos nomes dos módulos',
  'Diretrizes de design v2.2 com política de zero emojis na interface e botões principais em maiúsculo',
  'Desacoplamento autônomo da Central de Customizações & Loja (ShopStore) com catálogo multi-categoria e fachada JardimStore retrocompatível',
  'Motor de áudio procedural de foco puramente sintetizado via Web Audio API (ruídos coloridos, chuva e tons binaurais)',
  'Documentação técnica Docs-as-Code aprofundada com C4 Mermaid, JSDoc de contratos públicos e registros MADR (ADRs 0001, 0002 e 0003)'
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

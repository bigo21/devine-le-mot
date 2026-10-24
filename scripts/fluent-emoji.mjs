#!/usr/bin/env node
// Récupère l'icône Microsoft Fluent Emoji (style 3D, licence MIT) d'un emoji et la convertit en
// WebP 256 px dans src/assets/categories/ (docs/ASSETS.md §1 et §3).
//
//   node scripts/fluent-emoji.mjs 🍲 plats-camerounais
//
// Le premier lancement construit un index local des emojis Fluent (scripts/.cache, ignoré par git).
// Nécessite ffmpeg (encodeur libwebp).
import { execFileSync } from 'node:child_process';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, 'scripts', '.cache');
const INDEX = join(CACHE, 'fluent-index.json');
const OUT_DIR = join(ROOT, 'src', 'assets', 'categories');
const CREDITS = join(ROOT, 'assets', 'CREDITS.md');
const REPO = 'microsoft/fluentui-emoji';
const RAW = `https://raw.githubusercontent.com/${REPO}/main/`;
const SIZE = 256;

const [emoji, name] = process.argv.slice(2);
if (!emoji || !name || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
  console.error('Usage : node scripts/fluent-emoji.mjs <emoji> <nom-en-kebab-case>');
  process.exit(1);
}

/** Sans sélecteur de variante (U+FE0F), pour comparer les emojis de façon fiable. */
const normalize = (glyph) => glyph.replace(/️/g, '');

async function getJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'devine-le-mot-assets' } });
  if (!res.ok) throw new Error(`${res.status} sur ${url}`);
  return res.json();
}

async function buildIndex() {
  console.log('Construction de l’index Fluent Emoji (une seule fois)…');
  const root = await getJson(`https://api.github.com/repos/${REPO}/git/trees/main`);
  const assetsSha = root.tree.find((entry) => entry.path === 'assets').sha;
  const tree = await getJson(
    `https://api.github.com/repos/${REPO}/git/trees/${assetsSha}?recursive=1`,
  );
  if (tree.truncated) throw new Error('Arborescence Fluent tronquée par l’API GitHub.');

  const files = tree.tree.map((entry) => entry.path);
  const folders = files.filter((path) => !path.includes('/'));
  const index = {};
  const queue = [...folders];

  async function worker() {
    while (queue.length > 0) {
      const folder = queue.shift();
      const png = files
        .filter((path) => path.startsWith(`${folder}/`) && /\/3D\/[^/]+\.png$/.test(path))
        .sort((a, b) => Number(b.includes('/Default/')) - Number(a.includes('/Default/')))[0];
      if (!png) continue;
      try {
        const meta = await getJson(`${RAW}assets/${encodeURIComponent(folder)}/metadata.json`);
        index[normalize(meta.glyph)] = { folder, cldr: meta.cldr, png: `assets/${png}` };
      } catch {
        // Dossier sans métadonnées exploitables : ignoré.
      }
    }
  }

  await Promise.all(Array.from({ length: 24 }, worker));
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(INDEX, JSON.stringify(index));
  console.log(`Index : ${Object.keys(index).length} emojis.`);
  return index;
}

const index = existsSync(INDEX) ? JSON.parse(readFileSync(INDEX, 'utf8')) : await buildIndex();
const entry = index[normalize(emoji)];
if (!entry) {
  console.error(
    `Pas d’icône Fluent 3D pour ${emoji} (les drapeaux de pays n’existent pas en Fluent : utiliser flag-icons).`,
  );
  process.exit(2);
}

const pngUrl = RAW + entry.png.split('/').map(encodeURIComponent).join('/');
const res = await fetch(pngUrl);
if (!res.ok) throw new Error(`${res.status} sur ${pngUrl}`);
mkdirSync(CACHE, { recursive: true });
const tmp = join(CACHE, `${name}.png`);
writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));

mkdirSync(OUT_DIR, { recursive: true });
const out = join(OUT_DIR, `${name}.webp`);
execFileSync('ffmpeg', [
  '-loglevel',
  'error',
  '-y',
  '-i',
  tmp,
  '-vf',
  `scale=${SIZE}:${SIZE}:flags=lanczos`,
  '-c:v',
  'libwebp',
  '-lossless',
  '0',
  '-quality',
  '88',
  '-compression_level',
  '6',
  out,
]);

// Index des icônes (Metro n'accepte que des require statiques).
const names = readdirSync(OUT_DIR)
  .filter((file) => file.endsWith('.webp'))
  .map((file) => file.replace(/\.webp$/, ''))
  .sort();
writeFileSync(
  join(OUT_DIR, 'index.ts'),
  `// Fichier généré par scripts/fluent-emoji.mjs : icônes Fluent Emoji 3D (MIT), WebP ${SIZE} px.\n` +
    `export const categoryIcons = {\n` +
    names.map((icon) => `  '${icon}': require('./${icon}.webp') as number,`).join('\n') +
    `\n};\n\nexport type CategoryIconName = keyof typeof categoryIcons;\n`,
);

const credit = `| src/assets/categories/${name}.webp | Microsoft Fluent Emoji 3D « ${entry.cldr} » | https://github.com/${REPO} | MIT | ${new Date().toISOString().slice(0, 10)} |`;
const credits = existsSync(CREDITS) ? readFileSync(CREDITS, 'utf8') : '';
if (!credits.includes(`categories/${name}.webp`)) appendFileSync(CREDITS, `${credit}\n`);

console.log(`${emoji} → ${out.replace(`${ROOT}/`, '')} (${entry.cldr})`);

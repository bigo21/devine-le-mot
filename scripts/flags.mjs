#!/usr/bin/env node
// Récupère les drapeaux carrés de flag-icons (licence MIT) et les écrit dans
// src/assets/flags/flags.ts, sous forme de chaînes SVG lues par le composant Flag
// (Fluent Emoji n'a pas de drapeaux de pays : docs/ASSETS.md §1).
//
//   node scripts/flags.mjs cm fr us
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src', 'assets', 'flags', 'flags.ts');
const CREDITS = join(ROOT, 'assets', 'CREDITS.md');
const VERSION = '7.6.0';

const codes = process.argv.slice(2).map((code) => code.toLowerCase());
if (codes.length === 0 || codes.some((code) => !/^[a-z]{2}$/.test(code))) {
  console.error('Usage : node scripts/flags.mjs <code-pays ISO à 2 lettres>…');
  process.exit(1);
}

const flags = {};
for (const code of codes) {
  const url = `https://cdn.jsdelivr.net/npm/flag-icons@${VERSION}/flags/1x1/${code}.svg`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} sur ${url}`);
  const svg = (await res.text()).trim();
  // On n'accepte qu'un SVG simple : pas de script, pas de ressource externe.
  if (!svg.startsWith('<svg') || /<script|href="http|xlink:href="http/i.test(svg)) {
    throw new Error(`SVG inattendu pour ${code}`);
  }
  flags[code] = svg;
}

const body = Object.entries(flags)
  .map(([code, svg]) => `  ${code}: ${JSON.stringify(svg)},`)
  .join('\n');
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  `// Fichier généré par scripts/flags.mjs : drapeaux flag-icons ${VERSION} (MIT), format carré.\n` +
    `export const flags = {\n${body}\n} as const;\n\nexport type FlagCode = keyof typeof flags;\n`,
);

const credits = existsSync(CREDITS) ? readFileSync(CREDITS, 'utf8') : '';
const line = `| src/assets/flags/flags.ts | flag-icons ${VERSION} (${codes.join(', ')}) | https://github.com/lipis/flag-icons | MIT | ${new Date().toISOString().slice(0, 10)} |`;
if (!credits.includes('src/assets/flags/flags.ts')) appendFileSync(CREDITS, `${line}\n`);

console.log(`Drapeaux écrits : ${codes.join(', ')} → src/assets/flags/flags.ts`);

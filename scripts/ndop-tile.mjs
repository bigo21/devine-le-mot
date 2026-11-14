// Génère la tuile du motif Ndop (src/assets/patterns/ndop-tile@{1,2,3}x.png) avec Skia
// (canvaskit-wasm) et le même chemin que l'app (src/ui/patterns/ndop.ts) : rendu identique au
// filigrane dessiné en direct, mais affichable en image répétée, sans un canvas par carte.
// Usage : node scripts/ndop-tile.mjs
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ndopPath, NDOP_TILE } from '../src/ui/patterns/ndop.ts';

const require = createRequire(import.meta.url);
const CanvasKitInit = require('canvaskit-wasm');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// Période du motif : damier sur 2 colonnes, bandes tous les 3 rangs → 2 × 6 tuiles.
const WIDTH = NDOP_TILE * 2;
const HEIGHT = NDOP_TILE * 6;
/** Même trait que NdopPattern (dp). */
const STROKE = 1.5;

const ck = await CanvasKitInit();
for (const scale of [1, 2, 3]) {
  const surface = ck.MakeSurface(WIDTH * scale, HEIGHT * scale);
  const canvas = surface.getCanvas();
  canvas.clear(ck.TRANSPARENT);
  canvas.scale(scale, scale);
  const paint = new ck.Paint();
  paint.setColor(ck.WHITE);
  paint.setStyle(ck.PaintStyle.Stroke);
  paint.setStrokeWidth(STROKE);
  paint.setStrokeJoin(ck.StrokeJoin.Round);
  paint.setAntiAlias(true);
  const path = ck.Path.MakeFromSVGString(ndopPath(WIDTH, HEIGHT));
  canvas.drawPath(path, paint);
  const image = surface.makeImageSnapshot();
  const png = image.encodeToBytes();
  const suffix = scale === 1 ? '' : `@${scale}x`;
  const out = join(root, 'src/assets/patterns', `ndop-tile${suffix}.png`);
  writeFileSync(out, png);
  console.log(`${out} (${WIDTH * scale}×${HEIGHT * scale})`);
  path.delete();
  paint.delete();
  image.delete();
  surface.delete();
}

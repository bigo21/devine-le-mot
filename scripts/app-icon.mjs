// Génère l'icône PROVISOIRE de l'app à partir de la mascotte géométrique (src/ui/mascot,
// pose « salut ») avec Skia (canvaskit-wasm). L'icône définitive sera dessinée par un humain
// (docs/ASSETS.md §1) ; ce script ne sert qu'à débloquer les builds et les captures.
// Usage : node scripts/app-icon.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ndopPath, NDOP_TILE } from '../src/ui/patterns/ndop.ts';

const require = createRequire(import.meta.url);
const CanvasKitInit = require('canvaskit-wasm');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Tokens (src/ui/tokens.ts) : bg, mango, onMango, highlight, text.
const BG = '#120E1F';
const MANGO = '#FF9F1C';
const INK = '#120E1F';
const HIGHLIGHT = 'rgba(255, 255, 255, 0.22)';
const PATTERN = 'rgba(247, 243, 234, 0.06)';

// Géométrie de la mascotte (repère 100 × 100), pose « salut » : sourire légèrement ouvert.
const TAIL = 'M30 72 L22 92 Q21 95 25 93 L46 76 Z';
const EYES = [38, 62];
const EYE_Y = 42;
const MOUTH_Y = 60;
const MOUTH = { curve: 1, open: 0.25 };
/** Centre visuel de la mascotte dans son repère (corps + queue). */
const CENTER = { x: 50, y: 53 };

const ck = await CanvasKitInit();

function paint(color, style = ck.PaintStyle.Fill) {
  const p = new ck.Paint();
  p.setColor(ck.parseColorString(color));
  p.setStyle(style);
  p.setAntiAlias(true);
  return p;
}

/** Dessine la mascotte. `cutFeatures` : yeux et bouche évidés (icône monochrome). */
function drawMascot(canvas, { cx, cy, size, body = MANGO, ink = INK, cutFeatures = false }) {
  canvas.save();
  canvas.translate(cx, cy);
  canvas.scale(size / 100, size / 100);
  canvas.translate(-CENTER.x, -CENTER.y);

  const fill = paint(body);
  canvas.drawPath(ck.Path.MakeFromSVGString(TAIL), fill);
  canvas.drawRRect(ck.RRectXY(ck.XYWHRect(10, 12, 80, 64), 30, 30), fill);
  if (!cutFeatures) canvas.drawOval(ck.XYWHRect(22, 18, 20, 8), paint(HIGHLIGHT));

  const features = paint(ink);
  if (cutFeatures) features.setBlendMode(ck.BlendMode.Clear);
  for (const x of EYES) canvas.drawOval(ck.XYWHRect(x - 5, EYE_Y - 7, 10, 14), features);

  const top = MOUTH_Y + MOUTH.curve * 7 - MOUTH.open * 5;
  const bottom = MOUTH_Y + MOUTH.curve * 7 + MOUTH.open * 9;
  const half = 10 * (1 - MOUTH.open * 0.35);
  const mouth = ck.Path.MakeFromSVGString(
    `M${50 - half} ${MOUTH_Y} Q50 ${top} ${50 + half} ${MOUTH_Y} Q50 ${bottom} ${50 - half} ${MOUTH_Y} Z`,
  );
  canvas.drawPath(mouth, features);
  const stroke = paint(ink, ck.PaintStyle.Stroke);
  if (cutFeatures) stroke.setBlendMode(ck.BlendMode.Clear);
  stroke.setStrokeWidth(3.5);
  stroke.setStrokeCap(ck.StrokeCap.Round);
  stroke.setStrokeJoin(ck.StrokeJoin.Round);
  canvas.drawPath(mouth, stroke);
  canvas.restore();
}

function drawBackground(canvas, size, { pattern = true } = {}) {
  canvas.drawRect(ck.XYWHRect(0, 0, size, size), paint(BG));
  if (!pattern) return;
  // Filigrane Ndop, même motif que l'app, à l'échelle de l'icône.
  const scale = size / (NDOP_TILE * 9);
  canvas.save();
  canvas.scale(scale, scale);
  const stroke = paint(PATTERN, ck.PaintStyle.Stroke);
  stroke.setStrokeWidth(1.5);
  stroke.setStrokeJoin(ck.StrokeJoin.Round);
  canvas.drawPath(ck.Path.MakeFromSVGString(ndopPath(size / scale, size / scale)), stroke);
  canvas.restore();
}

function render(file, size, draw) {
  const surface = ck.MakeSurface(size, size);
  const canvas = surface.getCanvas();
  canvas.clear(ck.TRANSPARENT);
  draw(canvas, size);
  const png = surface.makeImageSnapshot().encodeToBytes();
  const out = join(root, file);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, png);
  console.log(`${file} (${size}×${size})`);
  surface.delete();
}

// Icône adaptative Android : la mascotte tient dans la zone sûre (cercle central de 66 %).
const SAFE = 0.56;
render('assets/images/android-icon-foreground.png', 1024, (c, s) =>
  drawMascot(c, { cx: s / 2, cy: s / 2, size: s * SAFE }),
);
render('assets/images/android-icon-background.png', 1024, (c, s) => drawBackground(c, s));
render('assets/images/android-icon-monochrome.png', 1024, (c, s) =>
  drawMascot(c, { cx: s / 2, cy: s / 2, size: s * SAFE, body: '#FFFFFF', cutFeatures: true }),
);
// Icône complète (ancien format, et base de l'icône Play Store).
render('assets/images/icon.png', 1024, (c, s) => {
  drawBackground(c, s);
  drawMascot(c, { cx: s / 2, cy: s / 2, size: s * 0.66 });
});
render('assets/store/play-store-icon-512.png', 512, (c, s) => {
  drawBackground(c, s);
  drawMascot(c, { cx: s / 2, cy: s / 2, size: s * 0.66 });
});
// Splash : la mascotte seule, sur le fond `bg` défini dans app.json.
render('assets/images/splash-icon.png', 512, (c, s) =>
  drawMascot(c, { cx: s / 2, cy: s / 2, size: s * 0.92 }),
);

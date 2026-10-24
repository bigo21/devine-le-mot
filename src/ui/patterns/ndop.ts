// Motif en filigrane inspiré des tissus Ndop des Grassfields (DESIGN.md §1) : panneaux carrés
// séparés par des bandes, qui alternent losanges concentriques et croisillons pointés.
// Fonction pure : renvoie un chemin SVG, dessiné une seule fois par Skia.

/** Taille d'un motif élémentaire, en dp. */
export const NDOP_TILE = 44;

function diamond(cx: number, cy: number, r: number): string {
  return `M${cx} ${cy - r}L${cx + r} ${cy}L${cx} ${cy + r}L${cx - r} ${cy}Z`;
}

function dot(cx: number, cy: number, r: number): string {
  return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0Z`;
}

function crossing(cx: number, cy: number, r: number): string {
  const d = r * 0.7;
  return (
    `M${cx - d} ${cy - d}L${cx + d} ${cy + d}M${cx + d} ${cy - d}L${cx - d} ${cy + d}` +
    dot(cx, cy - r, 1.6) +
    dot(cx + r, cy, 1.6) +
    dot(cx, cy + r, 1.6) +
    dot(cx - r, cy, 1.6)
  );
}

/** Chemin couvrant `width` × `height` ; décalé d'une demi-tuile pour ne pas coller aux bords. */
export function ndopPath(width: number, height: number, tile = NDOP_TILE): string {
  const parts: string[] = [];
  const cols = Math.ceil(width / tile) + 1;
  const rows = Math.ceil(height / tile) + 1;
  const half = tile / 2;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = col * tile;
      const cy = row * tile;
      if ((row + col) % 2 === 0) {
        parts.push(diamond(cx, cy, half * 0.62), diamond(cx, cy, half * 0.28));
      } else {
        parts.push(crossing(cx, cy, half * 0.5));
      }
    }
  }

  // Bandes horizontales tous les 3 rangs : les « panneaux » du tissu.
  for (let row = 0; row < rows; row += 3) {
    const y = row * tile + half;
    parts.push(`M0 ${y - 3}L${width} ${y - 3}M0 ${y + 3}L${width} ${y + 3}`);
  }

  return parts.join('');
}

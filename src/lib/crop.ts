// Turns a recognizer box (fractions of the image) into CSS for a square
// photo crop, so a review card can show the item the model meant (N2).

export type Box = { x: number; y: number; w: number; h: number };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * background-size and background-position (percentages) that show a square
 * around `box` with a little margin. Without a box, the whole image is
 * center-cropped.
 */
export function cropStyle(width: number, height: number, box?: Box | null): { backgroundSize: string; backgroundPosition: string } {
  const W = Math.max(1, width);
  const H = Math.max(1, height);
  const side = box ? clamp(Math.max(box.w * W, box.h * H) * 1.2, 1, Math.min(W, H)) : Math.min(W, H);
  const cx = box ? (box.x + box.w / 2) * W : W / 2;
  const cy = box ? (box.y + box.h / 2) * H : H / 2;
  const left = clamp(cx - side / 2, 0, W - side);
  const top = clamp(cy - side / 2, 0, H - side);
  const pct = (offset: number, room: number) => (room <= 0 ? 0 : (offset / room) * 100);
  const r = (n: number) => Math.round(n * 100) / 100;
  return {
    backgroundSize: `${r((W / side) * 100)}% ${r((H / side) * 100)}%`,
    backgroundPosition: `${r(pct(left, W - side))}% ${r(pct(top, H - side))}%`,
  };
}

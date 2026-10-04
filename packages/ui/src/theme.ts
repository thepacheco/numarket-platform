/* Tenant theming (Spec §11). A client picks one primary and one accent color;
   the system derives the shades and keeps text readable (4.5:1 contrast). */

export const NUMARKET = { navy: "#22577A", teal: "#38A3A5", green: "#57CC99", lightGreen: "#80ED99", mint: "#C7F9CC", ink: "#0B1F2E" };

type RGB = [number, number, number];

export function parseHex(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = (c: RGB) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();

function luminance([r, g, b]: RGB) {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrast(a: string, b: string) {
  const x = parseHex(a), y = parseHex(b);
  if (!x || !y) return 1;
  const [l1, l2] = [luminance(x), luminance(y)].sort((p, q) => q - p);
  return (l1 + 0.05) / (l2 + 0.05);
}

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Darken a color until it reads at 4.5:1 on white. */
export function readableOnWhite(hex: string) {
  const c = parseHex(hex) ?? parseHex(NUMARKET.navy)!;
  for (let t = 0; t <= 1; t += 0.05) {
    const out = toHex(mix(c, [0, 0, 0], t));
    if (contrast(out, "#FFFFFF") >= 4.5) return out;
  }
  return NUMARKET.ink;
}

export function brandVars(primary: string, accent: string): Record<string, string> {
  const p = parseHex(primary) ? primary : NUMARKET.navy;
  const a = parseHex(accent) ? accent : NUMARKET.teal;
  const pr = parseHex(p)!;
  return {
    "--brand": p,
    "--brand-text": readableOnWhite(p),
    "--brand-on": contrast(p, "#FFFFFF") >= 4.5 ? "#FFFFFF" : NUMARKET.ink,
    "--brand-soft": toHex(mix(pr, [255, 255, 255], 0.9)),
    "--brand-line": toHex(mix(pr, [255, 255, 255], 0.75)),
    "--accent": a,
    "--accent-text": readableOnWhite(a),
  };
}

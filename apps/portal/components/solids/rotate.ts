/* From the marketing site (components/solids/draw.ts): rotation for the product solids. */
import type { V3 } from "./geometry";

export type Rot = { x: number; y: number; z?: number };

export function rotate(v: V3, r: Rot): V3 {
  let [x, y, z] = v;
  const cz = Math.cos(r.z ?? 0),
    sz = Math.sin(r.z ?? 0);
  [x, y] = [x * cz - y * sz, x * sz + y * cz];
  const cy = Math.cos(r.y),
    sy = Math.sin(r.y);
  [x, z] = [x * cy + z * sy, -x * sy + z * cy];
  const cx = Math.cos(r.x),
    sx = Math.sin(r.x);
  [y, z] = [y * cx - z * sx, y * sx + z * cx];
  return [x, y, z];
}


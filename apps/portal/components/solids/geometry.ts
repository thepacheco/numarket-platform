/* Product solids: one wireframe shape per product.
   Foundation = cube on a 3×3×3 point lattice · Workspace = dodecahedron ·
   Insight Review = octahedron · Engineering = icosahedron (dashed).
   Every solid is scaled to a circumradius of 1. */

export type V3 = [number, number, number];
export type SolidKind = "foundation" | "workspace" | "insight" | "engineering";

export type Solid = {
  verts: V3[];
  edges: [number, number][];
  faces: number[][];
  /* lattice points drawn as dots (Foundation) */
  points?: V3[];
  /* faint interior grid lines between lattice points (Foundation) */
  grid?: [number, number][];
  dashed?: boolean;
};

export const solidColor: Record<SolidKind, { edge: string; face: string }> = {
  foundation: { edge: "#22577A", face: "#C7F9CC" },
  workspace: { edge: "#38A3A5", face: "#38A3A5" },
  insight: { edge: "#57CC99", face: "#57CC99" },
  engineering: { edge: "#9D92EA", face: "#B7AEF2" },
};

/* a deeper stroke for light backgrounds, so thin lines stay visible */
export const solidInk: Record<SolidKind, string> = {
  foundation: "#22577A",
  workspace: "#2a8f91",
  insight: "#2e9e6b",
  engineering: "#6c5dd3",
};

const PHI = (1 + Math.sqrt(5)) / 2;
const len = (v: V3) => Math.hypot(v[0], v[1], v[2]);
const dist = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const norm = (vs: V3[]) => {
  const r = Math.max(...vs.map(len));
  return vs.map((v) => [v[0] / r, v[1] / r, v[2] / r] as V3);
};
const edgesAt = (vs: V3[], d: number) => {
  const out: [number, number][] = [];
  for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) if (Math.abs(dist(vs[i], vs[j]) - d) < 1e-3) out.push([i, j]);
  return out;
};

function cube(): Solid {
  const pts: V3[] = [];
  for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) for (const z of [-1, 0, 1]) pts.push([x, y, z]);
  const s = 1 / Math.sqrt(3);
  const points = pts.map((p) => [p[0] * s, p[1] * s, p[2] * s] as V3);
  const corner = (p: V3) => p.every((c) => c !== 0);
  const verts = points.filter((_, i) => corner(pts[i]));
  const edges = edgesAt(verts, 2 * s);
  const idx = (x: number, y: number, z: number) => (x + 1) * 9 + (y + 1) * 3 + (z + 1);
  const grid: [number, number][] = [];
  for (const a of [-1, 0, 1])
    for (const b of [-1, 0, 1])
      for (const c of [-1, 0]) {
        grid.push([idx(c, a, b), idx(c + 1, a, b)], [idx(a, c, b), idx(a, c + 1, b)], [idx(a, b, c), idx(a, b, c + 1)]);
      }
  const faces: number[][] = [];
  const vi = (x: number, y: number, z: number) => verts.findIndex((v) => Math.sign(v[0]) === x && Math.sign(v[1]) === y && Math.sign(v[2]) === z);
  for (const sgn of [-1, 1]) {
    faces.push([vi(sgn, -1, -1), vi(sgn, 1, -1), vi(sgn, 1, 1), vi(sgn, -1, 1)]);
    faces.push([vi(-1, sgn, -1), vi(1, sgn, -1), vi(1, sgn, 1), vi(-1, sgn, 1)]);
    faces.push([vi(-1, -1, sgn), vi(1, -1, sgn), vi(1, 1, sgn), vi(-1, 1, sgn)]);
  }
  return { verts, edges, faces, points, grid };
}

function octahedron(): Solid {
  const verts: V3[] = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];
  const edges = edgesAt(verts, Math.SQRT2);
  const faces: number[][] = [];
  for (const x of [0, 1]) for (const y of [2, 3]) for (const z of [4, 5]) faces.push([x, y, z]);
  return { verts, edges, faces };
}

function icosahedron(): Solid {
  const raw: V3[] = [];
  for (const a of [-1, 1]) for (const b of [-PHI, PHI]) raw.push([0, a, b], [a, b, 0], [b, 0, a]);
  const edges = edgesAt(raw, 2);
  const verts = norm(raw);
  const faces: number[][] = [];
  const adj = (i: number, j: number) => edges.some(([a, b]) => (a === i && b === j) || (a === j && b === i));
  for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) for (let k = j + 1; k < 12; k++) if (adj(i, j) && adj(j, k) && adj(i, k)) faces.push([i, j, k]);
  return { verts, edges, faces, dashed: true };
}

function dodecahedron(): Solid {
  const raw: V3[] = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) raw.push([x, y, z]);
  for (const a of [-1, 1])
    for (const b of [-1, 1]) {
      raw.push([0, a / PHI, b * PHI], [a / PHI, b * PHI, 0], [a * PHI, 0, b / PHI]);
    }
  const edges = edgesAt(raw, 2 / PHI);
  const verts = norm(raw);
  // faces: the five vertices nearest each face direction (the dual icosahedron), in angular order
  const dirs: V3[] = [];
  for (const a of [-1, 1]) for (const b of [-1, 1]) dirs.push([0, a * PHI, b], [a * PHI, b, 0], [a, 0, b * PHI]);
  const faces = norm(dirs).map((c) => {
    const near = verts
      .map((v, i) => ({ i, d: v[0] * c[0] + v[1] * c[1] + v[2] * c[2] }))
      .sort((a, b) => b.d - a.d)
      .slice(0, 5)
      .map((o) => o.i);
    // angular order around c
    const up: V3 = Math.abs(c[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const u: V3 = [up[1] * c[2] - up[2] * c[1], up[2] * c[0] - up[0] * c[2], up[0] * c[1] - up[1] * c[0]];
    const w: V3 = [c[1] * u[2] - c[2] * u[1], c[2] * u[0] - c[0] * u[2], c[0] * u[1] - c[1] * u[0]];
    return near.sort((a, b) => {
      const va = verts[a],
        vb = verts[b];
      const ang = (v: V3) => Math.atan2(v[0] * w[0] + v[1] * w[1] + v[2] * w[2], v[0] * u[0] + v[1] * u[1] + v[2] * u[2]);
      return ang(va) - ang(vb);
    });
  });
  return { verts, edges, faces };
}

export const solids: Record<SolidKind, Solid> = {
  foundation: cube(),
  workspace: dodecahedron(),
  insight: octahedron(),
  engineering: icosahedron(),
};

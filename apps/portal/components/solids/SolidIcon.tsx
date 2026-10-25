import { solids, solidColor, solidInk, type SolidKind } from "./geometry";
import { rotate } from "./rotate";

/* A static drawing of a product solid, for small places (menus, labels).
   Same shapes and colors as the marketing site: Foundation cube (navy),
   Workspace dodecahedron (teal), Insight Review octahedron (green),
   Engineering icosahedron (purple, dashed). */
export default function SolidIcon({ kind, size = 20, className, muted = false }: { kind: SolidKind; size?: number; className?: string; muted?: boolean }) {
  const s = solids[kind];
  const rot = { x: 0.5, y: 0.6, z: 0.08 };
  const pv = s.verts.map((v) => rotate(v, rot));
  const P = (v: number[]) => `${(12 + v[0] * 10).toFixed(2)},${(12 - v[1] * 10).toFixed(2)}`;
  const edge = muted ? "#9AAAB8" : kind === "foundation" ? solidColor.foundation.edge : solidInk[kind];
  const es = s.edges.map(([i, j]) => ({ i, j, z: (pv[i][2] + pv[j][2]) / 2 })).sort((a, b) => a.z - b.z);
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {s.faces.map((f, i) => (
        <polygon key={i} points={f.map((k) => P(pv[k])).join(" ")} fill={solidColor[kind].face} opacity={kind === "foundation" ? 0.2 : 0.1} />
      ))}
      {es.map(({ i, j, z }) => (
        <line
          key={`${i}-${j}`}
          x1={P(pv[i]).split(",")[0]}
          y1={P(pv[i]).split(",")[1]}
          x2={P(pv[j]).split(",")[0]}
          y2={P(pv[j]).split(",")[1]}
          stroke={edge}
          strokeWidth={1.3}
          strokeLinecap="round"
          strokeDasharray={s.dashed ? "2 1.6" : undefined}
          opacity={0.35 + 0.65 * ((z + 1) / 2)}
        />
      ))}
      {s.points?.map((p, i) => {
        const q = rotate(p, rot);
        return <circle key={i} cx={12 + q[0] * 10} cy={12 - q[1] * 10} r={0.9} fill={edge} opacity={0.4 + 0.6 * ((q[2] + 1) / 2)} />;
      })}
    </svg>
  );
}

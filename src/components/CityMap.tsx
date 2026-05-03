import { useMemo } from "react";
import type { Node, Edge, DijkstraResult } from "@/lib/traffic-engine";
import { trafficColor } from "@/lib/traffic-engine";

type Props = {
  nodes: Node[];
  edges: Edge[];
  primary?: DijkstraResult | null;
  alternatives?: DijkstraResult[];
  source?: string | null;
  destination?: string | null;
  hoverNode?: string | null;
  onNodeClick?: (id: string) => void;
};

export function CityMap({ nodes, edges, primary, alternatives = [], source, destination, onNodeClick }: Props) {
  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
  const primarySet = useMemo(() => new Set(primary?.edges.map(e => e.id) ?? []), [primary]);
  const altSets = useMemo(() => alternatives.slice(1).map(a => new Set(a.edges.map(e => e.id))), [alternatives]);

  const width = 1100, height = 760;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
      <defs>
        <radialGradient id="bgGlow" cx="30%" cy="20%" r="80%">
          <stop offset="0%" stopColor="oklch(0.78 0.17 200 / 0.18)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="oklch(1 0 0 / 0.04)" strokeWidth="1" />
        </pattern>
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      <rect width={width} height={height} fill="url(#grid)" />
      <rect width={width} height={height} fill="url(#bgGlow)" />

      {/* base edges */}
      {edges.map(e => {
        const a = nodeMap.get(e.from)!; const b = nodeMap.get(e.to)!;
        const stroke = e.closed ? "oklch(0.5 0.04 260)" : trafficColor(e.congestion);
        const w = e.closed ? 2 : 4;
        return (
          <line key={e.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke={stroke} strokeWidth={w} strokeOpacity={e.closed ? 0.5 : 0.55}
            strokeLinecap="round" strokeDasharray={e.closed ? "4 6" : undefined} />
        );
      })}

      {/* alternative routes */}
      {altSets.map((set, idx) => (
        <g key={idx} opacity={0.55}>
          {edges.filter(e => set.has(e.id)).map(e => {
            const a = nodeMap.get(e.from)!; const b = nodeMap.get(e.to)!;
            return <line key={e.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke="var(--color-accent)" strokeWidth={5} strokeLinecap="round"
              strokeDasharray="6 8" />;
          })}
        </g>
      ))}

      {/* primary route glow */}
      {primary && (
        <g>
          <g filter="url(#soft)">
            {primary.edges.map(e => {
              const a = nodeMap.get(e.from)!; const b = nodeMap.get(e.to)!;
              return <line key={"g_" + e.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke="var(--color-primary)" strokeWidth={14} strokeLinecap="round" opacity={0.5} />;
            })}
          </g>
          {primary.edges.map(e => {
            const a = nodeMap.get(e.from)!; const b = nodeMap.get(e.to)!;
            return <line key={"p_" + e.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke="var(--color-primary)" strokeWidth={6} strokeLinecap="round"
              className="animate-route" />;
          })}
        </g>
      )}

      {/* nodes */}
      {nodes.map(n => {
        const isSrc = n.id === source;
        const isDst = n.id === destination;
        const isOnPath = primary?.path.includes(n.id);
        return (
          <g key={n.id} onClick={() => onNodeClick?.(n.id)} className="cursor-pointer">
            {(isSrc || isDst) && (
              <circle cx={n.x} cy={n.y} r={14} fill={isSrc ? "var(--color-primary)" : "var(--color-accent)"} opacity={0.25}>
                <animate attributeName="r" from="10" to="28" dur="1.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.5" to="0" dur="1.6s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={n.x} cy={n.y} r={isSrc || isDst ? 8 : isOnPath ? 5 : 3.5}
              fill={isSrc ? "var(--color-primary)" : isDst ? "var(--color-accent)" : isOnPath ? "var(--color-foreground)" : "oklch(0.85 0.02 250)"}
              stroke="oklch(0.16 0.025 260)" strokeWidth={1.5} />
            {(isSrc || isDst) && (
              <text x={n.x + 12} y={n.y - 12} fontSize="12" fill="var(--color-foreground)" fontWeight="600">
                {isSrc ? "From " : "To "}{n.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

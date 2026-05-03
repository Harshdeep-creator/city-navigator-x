import { Cpu, GitBranch, Layers, Database, Zap } from "lucide-react";

type Props = {
  vertices: number;
  edges: number;
  density: number;
  cacheHits: number;
  cacheMisses: number;
  cacheSize: number;
  segUpdatesPerSec: number;
  rerouteTriggers: number;
  activeAlgo: string;
  nodesExplored: number;
  responseMs: number;
  fwIterations: number;
  concurrentUsers: number;
  predictionConfidence: number;
};

export function AlgorithmInsights(p: Props) {
  const hitRate = p.cacheHits + p.cacheMisses === 0 ? 0 : (p.cacheHits / (p.cacheHits + p.cacheMisses)) * 100;
  const rows: { label: string; value: string; sub?: string }[] = [
    { label: "Active algorithm", value: p.activeAlgo, sub: "Auto-selected by load" },
    { label: "Time complexity", value: "O((V + E) log V)", sub: "Dijkstra + binary heap" },
    { label: "Worst case", value: "O(V³)", sub: "Floyd–Warshall fallback" },
    { label: "Vertices / Edges", value: `${p.vertices} / ${p.edges}` },
    { label: "Graph density", value: p.density.toFixed(3), sub: "2E / V(V-1)" },
    { label: "Nodes explored", value: `${p.nodesExplored}` },
    { label: "Query response", value: `${p.responseMs.toFixed(2)} ms` },
    { label: "Cache hit rate", value: `${hitRate.toFixed(1)}%`, sub: `${p.cacheHits} hits / ${p.cacheMisses} miss` },
    { label: "Memoized routes", value: `${p.cacheSize}` },
    { label: "Segment-tree updates", value: `${p.segUpdatesPerSec}/s` },
    { label: "Reroute triggers", value: `${p.rerouteTriggers}` },
    { label: "Floyd–Warshall ops", value: p.fwIterations.toLocaleString() },
    { label: "Prediction confidence", value: `${p.predictionConfidence.toFixed(1)}%` },
    { label: "Concurrent users", value: `${p.concurrentUsers}` },
  ];

  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Cpu className="h-3.5 w-3.5" />
        </div>
        <div>
          <div className="text-xs font-semibold">Algorithm insights</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">DSA telemetry · live</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {rows.map(r => (
          <div key={r.label} className="rounded-lg border border-border/50 bg-background/40 p-2">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{r.label}</div>
            <div className="mt-0.5 text-[12px] font-semibold tabular-nums">{r.value}</div>
            {r.sub && <div className="text-[9px] text-muted-foreground">{r.sub}</div>}
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1.5 text-[10px]">
        {[
          { icon: GitBranch, label: "Dijkstra" },
          { icon: Layers, label: "Floyd–W" },
          { icon: Database, label: "Seg-Tree" },
          { icon: Zap, label: "Greedy" },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center justify-center gap-1 rounded-md border border-border/40 bg-background/30 px-1 py-1.5">
            <Icon className="h-3 w-3 text-primary" /><span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

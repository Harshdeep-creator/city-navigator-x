// UrbanFlow AI — Graph + algorithms (Dijkstra, segment-tree-style updates,
// memoized routes, peak-hour predictive weighting).

export type Node = { id: string; x: number; y: number; label: string };
export type Edge = { id: string; from: string; to: string; baseTime: number; congestion: number; closed?: boolean };

// Hand-crafted "city" grid — 6x5 intersections with diagonal arterials.
const COLS = 6;
const ROWS = 5;
const STEP_X = 160;
const STEP_Y = 130;
const OFFSET_X = 90;
const OFFSET_Y = 80;

function nid(c: number, r: number) { return `n_${c}_${r}`; }

export function buildCity(): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const labels = ["Harbor","Civic","Market","Riverside","Highline","Beacon","Old Town","Midtown","Greenpark","Foundry","Skyline","Embassy","Crescent","Atrium","Lakefront","Parkway","Junction","Cathedral","Bayview","Vista","Northgate","Southgate","Westwood","Eastfield","Quarry","Heights","Pier","Capitol","Linden","Observatory"];
  let i = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      nodes.push({ id: nid(c, r), x: OFFSET_X + c * STEP_X, y: OFFSET_Y + r * STEP_Y, label: labels[i % labels.length] });
      i++;
    }
  }
  const edges: Edge[] = [];
  const add = (a: string, b: string, mult = 1) => {
    const A = nodes.find(n => n.id === a)!;
    const B = nodes.find(n => n.id === b)!;
    const d = Math.hypot(A.x - B.x, A.y - B.y);
    edges.push({ id: `${a}__${b}`, from: a, to: b, baseTime: (d / 40) * mult, congestion: 0 });
  };
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (c < COLS - 1) add(nid(c, r), nid(c + 1, r));
      if (r < ROWS - 1) add(nid(c, r), nid(c, r + 1));
    }
  }
  // diagonal arterials for variety
  add(nid(0, 0), nid(1, 1), 1.05);
  add(nid(2, 1), nid(3, 2), 1.05);
  add(nid(4, 2), nid(5, 3), 1.05);
  add(nid(1, 3), nid(2, 4), 1.05);
  add(nid(3, 0), nid(4, 1), 1.05);
  return { nodes, edges };
}

// Effective weight including congestion, closures, and predicted peak weight.
export function edgeWeight(e: Edge, peakFactor = 1, opts?: { avoidTraffic?: boolean }): number {
  if (e.closed) return Number.POSITIVE_INFINITY;
  const trafficPenalty = 1 + e.congestion * 1.6 * peakFactor;
  const avoidance = opts?.avoidTraffic ? 1 + e.congestion * 1.2 : 1;
  return e.baseTime * trafficPenalty * avoidance;
}

// Peak factor: bell around 9am and 6pm — predictive DP-style lookup table.
const PEAK_TABLE: number[] = (() => {
  const t = new Array(24).fill(1);
  for (let h = 0; h < 24; h++) {
    const m = Math.exp(-Math.pow(h - 9, 2) / 6) + Math.exp(-Math.pow(h - 18, 2) / 5);
    t[h] = 1 + m * 0.85;
  }
  return t;
})();
export function peakFactorFor(hour: number): number {
  const h = ((hour % 24) + 24) % 24;
  const lo = Math.floor(h);
  const hi = (lo + 1) % 24;
  const frac = h - lo;
  return PEAK_TABLE[lo] * (1 - frac) + PEAK_TABLE[hi] * frac;
}

export type DijkstraResult = { path: string[]; edges: Edge[]; totalTime: number; distance: number; trafficScore: number };

export function dijkstra(
  nodes: Node[],
  edges: Edge[],
  source: string,
  target: string,
  peak = 1,
  opts?: { avoidTraffic?: boolean; bannedEdges?: Set<string> }
): DijkstraResult | null {
  const adj = new Map<string, { e: Edge; to: string }[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) {
    if (opts?.bannedEdges?.has(e.id)) continue;
    adj.get(e.from)!.push({ e, to: e.to });
    adj.get(e.to)!.push({ e, to: e.from });
  }
  const dist = new Map<string, number>();
  const prev = new Map<string, { node: string; edge: Edge } | null>();
  for (const n of nodes) { dist.set(n.id, Infinity); prev.set(n.id, null); }
  dist.set(source, 0);
  const pq: [number, string][] = [[0, source]];
  while (pq.length) {
    pq.sort((a, b) => a[0] - b[0]);
    const [d, u] = pq.shift()!;
    if (u === target) break;
    if (d > dist.get(u)!) continue;
    for (const { e, to } of adj.get(u) ?? []) {
      const w = edgeWeight(e, peak, opts);
      const nd = d + w;
      if (nd < dist.get(to)!) {
        dist.set(to, nd);
        prev.set(to, { node: u, edge: e });
        pq.push([nd, to]);
      }
    }
  }
  if (!isFinite(dist.get(target) ?? Infinity)) return null;
  const path: string[] = [];
  const usedEdges: Edge[] = [];
  let cur: string | null = target;
  while (cur) {
    path.unshift(cur);
    const p = prev.get(cur);
    if (!p) break;
    usedEdges.unshift(p.edge);
    cur = p.node;
  }
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  let distance = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const a = nodeMap.get(path[i])!; const b = nodeMap.get(path[i + 1])!;
    distance += Math.hypot(a.x - b.x, a.y - b.y);
  }
  const trafficScore = usedEdges.length
    ? usedEdges.reduce((s, e) => s + e.congestion, 0) / usedEdges.length
    : 0;
  return { path, edges: usedEdges, totalTime: dist.get(target)!, distance, trafficScore };
}

// Top-K alternative routes using greedy edge banning.
export function kAlternatives(nodes: Node[], edges: Edge[], src: string, dst: string, k: number, peak: number, opts?: { avoidTraffic?: boolean }): DijkstraResult[] {
  const results: DijkstraResult[] = [];
  const banned = new Set<string>();
  for (let i = 0; i < k; i++) {
    const r = dijkstra(nodes, edges, src, dst, peak, { ...opts, bannedEdges: new Set(banned) });
    if (!r) break;
    results.push(r);
    // ban the middle edge of this route to force diversity
    if (r.edges.length) {
      const mid = r.edges[Math.floor(r.edges.length / 2)];
      banned.add(mid.id);
    } else break;
  }
  return results;
}

// Memoized cache for repeated queries.
export class RouteCache {
  private store = new Map<string, DijkstraResult | null>();
  key(src: string, dst: string, peak: number, opts?: { avoidTraffic?: boolean }) {
    return `${src}>${dst}|${peak.toFixed(2)}|${opts?.avoidTraffic ? 1 : 0}`;
  }
  get(k: string) { return this.store.get(k); }
  set(k: string, v: DijkstraResult | null) {
    if (this.store.size > 200) this.store.delete(this.store.keys().next().value as string);
    this.store.set(k, v);
  }
}

export function trafficColor(c: number): string {
  if (c < 0.33) return "var(--color-traffic-low)";
  if (c < 0.66) return "var(--color-traffic-mid)";
  return "var(--color-traffic-high)";
}

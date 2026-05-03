// UrbanFlow AI — Delhi NCR routing engine.
// Implements: Dijkstra (binary heap), Floyd–Warshall (APSP),
// Segment tree for range congestion updates, DP route memoization,
// Greedy K-alternative reroute, and predictive peak-hour modeling.

export type Node = { id: string; lat: number; lng: number; label: string; zone?: string };
export type Edge = {
  id: string;
  from: string;
  to: string;
  baseTime: number; // minutes in free flow
  distanceKm: number;
  congestion: number; // 0..1
  closed?: boolean;
  isHighway?: boolean;
  toll?: boolean;
};

// ---------- Delhi NCR graph ----------
const N = (id: string, label: string, lat: number, lng: number, zone?: string): Node =>
  ({ id, label, lat, lng, zone });

export const DELHI_NODES: Node[] = [
  N("cp", "Connaught Place", 28.6315, 77.2167, "Central"),
  N("ig", "India Gate", 28.6129, 77.2295, "Central"),
  N("kb", "Karol Bagh", 28.6519, 77.1909, "Central"),
  N("cl", "Civil Lines", 28.6776, 77.2243, "North"),
  N("od", "Old Delhi Stn", 28.6608, 77.2280, "Central"),
  N("ch", "Chanakyapuri", 28.5946, 77.1904, "Central"),
  N("aiims", "AIIMS", 28.5672, 77.2100, "South"),
  N("hk", "Hauz Khas", 28.5494, 77.2001, "South"),
  N("sk", "Saket", 28.5244, 77.2066, "South"),
  N("vk", "Vasant Kunj", 28.5200, 77.1592, "South-West"),
  N("ln", "Lajpat Nagar", 28.5707, 77.2373, "South"),
  N("np", "Nehru Place", 28.5494, 77.2519, "South"),
  N("mv", "Mayur Vihar", 28.6094, 77.2950, "East"),
  N("av", "Anand Vihar", 28.6469, 77.3157, "East"),
  N("sh", "Shahdara", 28.6735, 77.2885, "East"),
  N("rj", "Rajouri Garden", 28.6469, 77.1207, "West"),
  N("jp", "Janakpuri", 28.6219, 77.0878, "West"),
  N("dw", "Dwarka", 28.5921, 77.0460, "South-West"),
  N("igi", "IGI Airport", 28.5562, 77.1000, "South-West"),
  N("rh", "Rohini", 28.7041, 77.1025, "North-West"),
  N("pt", "Pitampura", 28.6973, 77.1325, "North-West"),
  N("gcc", "Gurgaon Cyber City", 28.4951, 77.0890, "Gurgaon"),
  N("gmg", "MG Road Gurgaon", 28.4796, 77.0813, "Gurgaon"),
  N("n18", "Noida Sec 18", 28.5707, 77.3260, "Noida"),
  N("n62", "Noida Sec 62", 28.6280, 77.3649, "Noida"),
  N("gn", "Greater Noida", 28.4744, 77.5040, "Noida"),
  N("fb", "Faridabad", 28.4089, 77.3178, "Faridabad"),
  N("gz", "Ghaziabad", 28.6692, 77.4538, "Ghaziabad"),
];

const HAVERSINE = (a: Node, b: Node) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

const EDGE_DEFS: [string, string, { hw?: boolean; toll?: boolean; mult?: number }?][] = [
  ["cp", "ig"], ["cp", "kb"], ["cp", "od"], ["cp", "cl"], ["cp", "ch"],
  ["ig", "ch"], ["ig", "ln"], ["ig", "aiims"],
  ["kb", "rj"], ["kb", "od"], ["cl", "od"], ["cl", "sh"],
  ["od", "sh"], ["sh", "av"], ["av", "n62", { hw: true }],
  ["av", "gz", { hw: true, toll: true }],
  ["mv", "ln"], ["mv", "n18", { hw: true }], ["mv", "av"],
  ["ch", "aiims"], ["aiims", "hk"], ["hk", "sk"], ["hk", "ln"],
  ["sk", "vk"], ["sk", "np"], ["np", "ln"], ["np", "mv"],
  ["vk", "igi", { hw: true }], ["vk", "gcc", { hw: true, toll: true }],
  ["rj", "jp"], ["jp", "dw"], ["dw", "igi", { hw: true }],
  ["igi", "gcc", { hw: true, toll: true }], ["gcc", "gmg"],
  ["rj", "pt"], ["pt", "rh"], ["rh", "cl", { hw: true }],
  ["pt", "kb"], ["n18", "n62"], ["n18", "gn", { hw: true, toll: true }],
  ["n62", "gz"], ["fb", "sk", { hw: true, toll: true }], ["fb", "n18", { hw: true }],
  ["gn", "fb", { hw: true, toll: true }], ["gmg", "fb", { hw: true, toll: true }],
];

export function buildDelhi(): { nodes: Node[]; edges: Edge[] } {
  const nodes = DELHI_NODES;
  const map = new Map(nodes.map(n => [n.id, n]));
  const edges: Edge[] = EDGE_DEFS.map(([a, b, opt]) => {
    const A = map.get(a)!; const B = map.get(b)!;
    const km = HAVERSINE(A, B) * (opt?.mult ?? 1);
    const speed = opt?.hw ? 65 : 32; // km/h free-flow
    return {
      id: `${a}__${b}`,
      from: a, to: b,
      distanceKm: km,
      baseTime: (km / speed) * 60,
      congestion: 0.2 + Math.random() * 0.3,
      isHighway: !!opt?.hw,
      toll: !!opt?.toll,
    };
  });
  return { nodes, edges };
}

// ---------- Predictive peak-hour DP table ----------
const PEAK_TABLE: number[] = (() => {
  const t = new Array(24).fill(1);
  for (let h = 0; h < 24; h++) {
    const m = Math.exp(-Math.pow(h - 9.5, 2) / 5) + Math.exp(-Math.pow(h - 18.5, 2) / 4.5);
    t[h] = 1 + m * 0.95;
  }
  return t;
})();
export function peakFactorFor(hour: number): number {
  const h = ((hour % 24) + 24) % 24;
  const lo = Math.floor(h), hi = (lo + 1) % 24, f = h - lo;
  return PEAK_TABLE[lo] * (1 - f) + PEAK_TABLE[hi] * f;
}

export type RouteOpts = {
  avoidTraffic?: boolean;
  avoidTolls?: boolean;
  fastest?: boolean; // false = shortest distance
  predictive?: boolean;
  bannedEdges?: Set<string>;
  weatherMult?: number;
  festivalMult?: number;
};

export function edgeWeight(e: Edge, peak: number, opts: RouteOpts): number {
  if (e.closed) return Number.POSITIVE_INFINITY;
  if (opts.avoidTolls && e.toll) return e.distanceKm * 60; // strong penalty
  const weather = opts.weatherMult ?? 1;
  const festival = opts.festivalMult ?? 1;
  const traffic = 1 + e.congestion * 1.6 * peak * weather * festival;
  const avoidance = opts.avoidTraffic ? 1 + e.congestion * 1.4 : 1;
  if (!opts.fastest) return e.distanceKm; // shortest mode
  return e.baseTime * traffic * avoidance;
}

// ---------- Min-heap (binary heap priority queue) ----------
class MinHeap<T> {
  private h: { k: number; v: T }[] = [];
  size() { return this.h.length; }
  push(k: number, v: T) {
    this.h.push({ k, v });
    let i = this.h.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.h[p].k <= this.h[i].k) break;
      [this.h[p], this.h[i]] = [this.h[i], this.h[p]];
      i = p;
    }
  }
  pop(): { k: number; v: T } | undefined {
    if (!this.h.length) return;
    const top = this.h[0];
    const last = this.h.pop()!;
    if (this.h.length) {
      this.h[0] = last;
      let i = 0;
      const n = this.h.length;
      while (true) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < n && this.h[l].k < this.h[m].k) m = l;
        if (r < n && this.h[r].k < this.h[m].k) m = r;
        if (m === i) break;
        [this.h[m], this.h[i]] = [this.h[i], this.h[m]];
        i = m;
      }
    }
    return top;
  }
}

export type DijkstraResult = {
  path: string[];
  edges: Edge[];
  totalTime: number;
  distance: number;
  trafficScore: number;
  nodesExplored: number;
  hasToll: boolean;
};

export function dijkstra(
  nodes: Node[], edges: Edge[],
  source: string, target: string,
  peak: number, opts: RouteOpts = {}
): DijkstraResult | null {
  const adj = new Map<string, { e: Edge; to: string }[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) {
    if (opts.bannedEdges?.has(e.id)) continue;
    adj.get(e.from)!.push({ e, to: e.to });
    adj.get(e.to)!.push({ e, to: e.from });
  }
  const dist = new Map<string, number>();
  const prev = new Map<string, { node: string; edge: Edge } | null>();
  for (const n of nodes) { dist.set(n.id, Infinity); prev.set(n.id, null); }
  dist.set(source, 0);
  const pq = new MinHeap<string>();
  pq.push(0, source);
  let explored = 0;
  const seen = new Set<string>();
  while (pq.size()) {
    const top = pq.pop()!;
    const u = top.v, d = top.k;
    if (seen.has(u)) continue;
    seen.add(u); explored++;
    if (u === target) break;
    for (const { e, to } of adj.get(u) ?? []) {
      const w = edgeWeight(e, peak, opts);
      const nd = d + w;
      if (nd < (dist.get(to) ?? Infinity)) {
        dist.set(to, nd);
        prev.set(to, { node: u, edge: e });
        pq.push(nd, to);
      }
    }
  }
  if (!isFinite(dist.get(target) ?? Infinity)) return null;
  const path: string[] = []; const used: Edge[] = [];
  let cur: string | null = target;
  while (cur) {
    path.unshift(cur);
    const p = prev.get(cur);
    if (!p) break;
    used.unshift(p.edge);
    cur = p.node;
  }
  const distance = used.reduce((s, e) => s + e.distanceKm, 0);
  const trafficScore = used.length ? used.reduce((s, e) => s + e.congestion, 0) / used.length : 0;
  const totalTime = used.reduce((s, e) => s + edgeWeight(e, peak, { ...opts, fastest: true }), 0);
  return { path, edges: used, totalTime, distance, trafficScore, nodesExplored: explored, hasToll: used.some(e => e.toll) };
}

// ---------- Floyd–Warshall (APSP) — runs once for diagnostics ----------
export function floydWarshall(nodes: Node[], edges: Edge[]): { matrix: number[][]; iterations: number } {
  const n = nodes.length;
  const idx = new Map(nodes.map((nd, i) => [nd.id, i]));
  const d: number[][] = Array.from({ length: n }, () => Array(n).fill(Infinity));
  for (let i = 0; i < n; i++) d[i][i] = 0;
  for (const e of edges) {
    const a = idx.get(e.from)!, b = idx.get(e.to)!;
    const w = e.baseTime;
    d[a][b] = Math.min(d[a][b], w);
    d[b][a] = Math.min(d[b][a], w);
  }
  for (let k = 0; k < n; k++)
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        if (d[i][k] + d[k][j] < d[i][j]) d[i][j] = d[i][k] + d[k][j];
  return { matrix: d, iterations: n * n * n };
}

// ---------- Segment tree for range congestion updates ----------
export class SegmentTree {
  private n: number;
  private tree: number[];
  private lazy: number[];
  constructor(arr: number[]) {
    this.n = arr.length;
    this.tree = new Array(this.n * 4).fill(0);
    this.lazy = new Array(this.n * 4).fill(0);
    this.build(1, 0, this.n - 1, arr);
  }
  private build(node: number, l: number, r: number, arr: number[]) {
    if (l === r) { this.tree[node] = arr[l]; return; }
    const m = (l + r) >> 1;
    this.build(node * 2, l, m, arr);
    this.build(node * 2 + 1, m + 1, r, arr);
    this.tree[node] = Math.max(this.tree[node * 2], this.tree[node * 2 + 1]);
  }
  private push(node: number) {
    if (this.lazy[node]) {
      for (const c of [node * 2, node * 2 + 1]) {
        this.tree[c] += this.lazy[node];
        this.lazy[c] += this.lazy[node];
      }
      this.lazy[node] = 0;
    }
  }
  rangeAdd(l: number, r: number, val: number) { this._add(1, 0, this.n - 1, l, r, val); }
  private _add(node: number, nl: number, nr: number, l: number, r: number, v: number) {
    if (r < nl || nr < l) return;
    if (l <= nl && nr <= r) { this.tree[node] += v; this.lazy[node] += v; return; }
    this.push(node);
    const m = (nl + nr) >> 1;
    this._add(node * 2, nl, m, l, r, v);
    this._add(node * 2 + 1, m + 1, nr, l, r, v);
    this.tree[node] = Math.max(this.tree[node * 2], this.tree[node * 2 + 1]);
  }
  queryMax(l: number, r: number): number { return this._max(1, 0, this.n - 1, l, r); }
  private _max(node: number, nl: number, nr: number, l: number, r: number): number {
    if (r < nl || nr < l) return -Infinity;
    if (l <= nl && nr <= r) return this.tree[node];
    this.push(node);
    const m = (nl + nr) >> 1;
    return Math.max(
      this._max(node * 2, nl, m, l, r),
      this._max(node * 2 + 1, m + 1, nr, l, r)
    );
  }
}

// ---------- Greedy K-alternative routing ----------
export function kAlternatives(
  nodes: Node[], edges: Edge[],
  src: string, dst: string, k: number, peak: number, opts: RouteOpts = {}
): DijkstraResult[] {
  const out: DijkstraResult[] = [];
  const banned = new Set<string>();
  for (let i = 0; i < k; i++) {
    const r = dijkstra(nodes, edges, src, dst, peak, { ...opts, bannedEdges: new Set(banned) });
    if (!r) break;
    out.push(r);
    if (!r.edges.length) break;
    banned.add(r.edges[Math.floor(r.edges.length / 2)].id);
  }
  return out;
}

// ---------- DP memoization cache ----------
export class RouteCache {
  private store = new Map<string, DijkstraResult | null>();
  hits = 0; misses = 0;
  key(src: string, dst: string, peak: number, opts: RouteOpts) {
    return [src, dst, peak.toFixed(2), opts.avoidTraffic ? 1 : 0, opts.avoidTolls ? 1 : 0,
            opts.fastest ? 1 : 0, (opts.weatherMult ?? 1).toFixed(2),
            (opts.festivalMult ?? 1).toFixed(2)].join("|");
  }
  get(k: string) {
    const v = this.store.get(k);
    if (v !== undefined) this.hits++; else this.misses++;
    return v;
  }
  set(k: string, v: DijkstraResult | null) {
    if (this.store.size > 256) this.store.delete(this.store.keys().next().value as string);
    this.store.set(k, v);
  }
  size() { return this.store.size; }
  reset() { this.store.clear(); this.hits = 0; this.misses = 0; }
}

export function trafficColor(c: number): string {
  if (c < 0.33) return "#22c55e";
  if (c < 0.66) return "#f59e0b";
  return "#ef4444";
}

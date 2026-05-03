import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Clock, Moon, Sun } from "lucide-react";
import { MapCanvas } from "@/components/MapCanvas";
import { Sidebar } from "@/components/Sidebar";
import { AnalyticsPanel } from "@/components/AnalyticsPanel";
import { AlertsFeed, type Alert } from "@/components/AlertsFeed";
import { AlgorithmInsights } from "@/components/AlgorithmInsights";
import { SimulationControls, type SimFlags } from "@/components/SimulationControls";
import { CppReferenceButton } from "@/components/CppReference";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  buildDelhi, dijkstra, kAlternatives, peakFactorFor, RouteCache,
  SegmentTree, floydWarshall,
  type DijkstraResult, type Edge,
} from "@/lib/traffic-engine";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UrbanFlow AI — Predictive Delhi NCR routing" },
      { name: "description", content: "Real-time traffic intelligence for Delhi NCR with Dijkstra, Floyd–Warshall, segment-tree updates and predictive peak-hour modeling." },
      { property: "og:title", content: "UrbanFlow AI — Predictive Delhi NCR routing" },
      { property: "og:description", content: "Google Maps-style traffic intelligence powered by competitive-programming graph algorithms." },
    ],
  }),
  component: Dashboard,
});

type Mode = "fastest" | "shortest" | "predictive";

type Incident = { id: string; kind: Alert["kind"]; lat: number; lng: number };

function Dashboard() {
  const { nodes, edges: initial } = useMemo(() => buildDelhi(), []);
  const [edges, setEdges] = useState<Edge[]>(initial);
  const [source, setSource] = useState<string | null>("igi");
  const [destination, setDestination] = useState<string | null>("n62");
  const [avoidTraffic, setAvoidTraffic] = useState(true);
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [mode, setMode] = useState<Mode>("fastest");
  const [hour, setHour] = useState(9);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [flags, setFlags] = useState<SimFlags>({
    rain: false, festival: false, accidentInject: false, roadblock: false, peakOffice: false,
  });
  const [density, setDensity] = useState<{ t: number; v: number }[]>(() =>
    Array.from({ length: 30 }, (_, i) => ({ t: i, v: 0.3 })));
  const [travelTimes, setTravelTimes] = useState<{ t: number; v: number }[]>(() =>
    Array.from({ length: 30 }, (_, i) => ({ t: i, v: 0 })));
  const [responseMs, setResponseMs] = useState(0);
  const [segUpdates, setSegUpdates] = useState(0);
  const [rerouteTriggers, setRerouteTriggers] = useState(0);
  const [concurrentUsers, setConcurrentUsers] = useState(184);
  const cacheRef = useRef(new RouteCache());
  const tickRef = useRef(0);

  // theme
  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  const peak = peakFactorFor(hour) * (flags.peakOffice ? 1.25 : 1);
  const weatherMult = flags.rain ? 1.35 : 1;
  const festivalMult = flags.festival ? 1.4 : 1;

  const opts = useMemo(() => ({
    avoidTraffic, avoidTolls,
    fastest: mode !== "shortest",
    predictive: mode === "predictive",
    weatherMult, festivalMult,
  }), [avoidTraffic, avoidTolls, mode, weatherMult, festivalMult]);

  const alternatives = useMemo(() => {
    if (!source || !destination) return [];
    return kAlternatives(nodes, edges, source, destination, 3, peak, opts);
  }, [nodes, edges, source, destination, peak, opts]);

  const primary: DijkstraResult | null = useMemo(() => {
    if (!source || !destination) return null;
    const cache = cacheRef.current;
    const key = cache.key(source, destination, peak, opts);
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    const t0 = performance.now();
    const r = dijkstra(nodes, edges, source, destination, peak, opts);
    setResponseMs(performance.now() - t0);
    cache.set(key, r);
    return r;
  }, [nodes, edges, source, destination, peak, opts]);

  // Floyd-Warshall once for telemetry
  const fw = useMemo(() => floydWarshall(nodes, edges), [nodes, edges]);

  // segment tree for congestion bursts (range updates)
  useEffect(() => {
    const id = setInterval(() => {
      tickRef.current += 1;
      setEdges(prev => {
        const arr = prev.map(e => e.congestion);
        const seg = new SegmentTree(arr);
        const bursts = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < bursts; i++) {
          const l = Math.floor(Math.random() * arr.length);
          const r = Math.min(arr.length - 1, l + Math.floor(Math.random() * 4));
          seg.rangeAdd(l, r, (Math.random() - 0.5) * 0.18);
        }
        setSegUpdates(bursts);
        return prev.map((e, i) => {
          let c = arr[i] + (Math.random() - 0.5) * 0.06;
          // segment tree contribution
          const m = seg.queryMax(i, i);
          c = (c + m) / 2;
          c = Math.max(0.05, Math.min(1, c * 0.97));
          return { ...e, congestion: c };
        });
      });
      cacheRef.current.reset();
      setConcurrentUsers(u => Math.max(80, Math.min(420, u + Math.round((Math.random() - 0.5) * 14))));
    }, 1800);
    return () => clearInterval(id);
  }, []);

  // charts feed
  useEffect(() => {
    const avg = edges.reduce((s, e) => s + e.congestion, 0) / edges.length;
    setDensity(d => [...d.slice(1), { t: tickRef.current, v: Number(avg.toFixed(3)) }]);
    setTravelTimes(d => [...d.slice(1), { t: tickRef.current, v: primary ? Math.round(primary.totalTime) : 0 }]);
  }, [edges, primary]);

  // alerts + incidents
  useEffect(() => {
    const id = setInterval(() => {
      const trigger = flags.accidentInject || flags.roadblock || Math.random() > 0.5;
      if (!trigger) return;
      const e = edges[Math.floor(Math.random() * edges.length)];
      const a = nodes.find(n => n.id === e.from)!; const b = nodes.find(n => n.id === e.to)!;
      const kinds: Alert["kind"][] = flags.roadblock ? ["closure"] : flags.accidentInject ? ["accident"] : ["accident", "closure", "spike"];
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      const newAlert: Alert = { id: `${Date.now()}_${Math.random()}`, kind, message: `${a.label} → ${b.label}`, ts: Date.now() };
      setAlerts(prev => [newAlert, ...prev].slice(0, 6));
      const inc: Incident = { id: newAlert.id, kind, lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
      setIncidents(prev => [inc, ...prev].slice(0, 8));
      setRerouteTriggers(r => r + 1);
      if (kind === "closure") {
        setEdges(prev => prev.map(x => x.id === e.id ? { ...x, closed: true } : x));
        setTimeout(() => setEdges(prev => prev.map(x => x.id === e.id ? { ...x, closed: false } : x)), 10000);
        setTimeout(() => setIncidents(prev => prev.filter(i => i.id !== inc.id)), 10000);
      } else if (kind === "spike") {
        setEdges(prev => prev.map(x => x.id === e.id ? { ...x, congestion: Math.min(1, x.congestion + 0.5) } : x));
        setTimeout(() => setIncidents(prev => prev.filter(i => i.id !== inc.id)), 9000);
      } else {
        setTimeout(() => setIncidents(prev => prev.filter(i => i.id !== inc.id)), 12000);
      }
    }, 5500);
    return () => clearInterval(id);
  }, [edges, nodes, flags]);

  const handleNodeClick = (id: string) => {
    if (!source || (source && destination)) { setSource(id); setDestination(null); }
    else if (source && !destination && id !== source) { setDestination(id); }
  };

  const onOptimize = () => { cacheRef.current.reset(); setEdges(e => [...e]); };

  const cache = cacheRef.current;
  const V = nodes.length, E = edges.length;
  const graphDensity = (2 * E) / (V * (V - 1));
  const activeAlgo = mode === "predictive"
    ? "Dijkstra + Predictive DP"
    : flags.roadblock ? "Greedy Reroute"
    : flags.accidentInject ? "Segment-Tree Update + Dijkstra"
    : "Dijkstra (binary heap)";
  const predictionConfidence = 70 + (1 - Math.min(1, density[density.length - 1]?.v ?? 0)) * 25;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      {/* Map */}
      <div className="absolute inset-0 z-0 isolate">
        <MapCanvas
          nodes={nodes} edges={edges}
          primary={primary} alternatives={alternatives}
          source={source} destination={destination}
          incidents={incidents} theme={theme}
          onNodeClick={handleNodeClick}
        />
      </div>

      {/* Top bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start justify-between p-4">
        <motion.div initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="glass pointer-events-auto flex items-center gap-3 rounded-2xl px-4 py-2.5 shadow-xl">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
            <Activity className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">UrbanFlow AI</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Delhi NCR · Predictive routing</div>
          </div>
        </motion.div>

        <motion.div initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="glass pointer-events-auto flex items-center gap-3 rounded-2xl px-4 py-2 shadow-xl">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <div className="w-56">
            <Slider value={[hour]} min={6} max={23} step={0.25} onValueChange={v => setHour(v[0])} />
          </div>
          <div className="w-14 text-right text-xs tabular-nums text-muted-foreground">
            {String(Math.floor(hour)).padStart(2, "0")}:{String(Math.floor((hour % 1) * 60)).padStart(2, "0")}
          </div>
          <div className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
            Peak ×{peak.toFixed(2)}
          </div>
        </motion.div>

        <motion.div initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="pointer-events-auto flex items-center gap-2">
          <CppReferenceButton />
          <Button variant="outline" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="glass h-10 w-10 border-border/40">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </motion.div>
      </header>

      {/* Left sidebar */}
      <div className="absolute left-0 top-20 bottom-4 z-30">
        <Sidebar
          nodes={nodes}
          source={source} destination={destination}
          setSource={setSource} setDestination={setDestination}
          avoidTraffic={avoidTraffic} setAvoidTraffic={setAvoidTraffic}
          avoidTolls={avoidTolls} setAvoidTolls={setAvoidTolls}
          mode={mode} setMode={setMode}
          onOptimize={onOptimize}
        />
      </div>

      {/* Right analytics */}
      <motion.aside
        initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
        className="absolute right-3 top-20 bottom-4 z-30 w-[360px]">
        <div className="glass flex h-full flex-col gap-3 overflow-y-auto rounded-2xl p-3 shadow-2xl">
          <AnalyticsPanel primary={primary} alternatives={alternatives} density={density} travelTimes={travelTimes} />

          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Simulation controls</div>
            <SimulationControls flags={flags} setFlags={setFlags} />
          </div>

          <AlgorithmInsights
            vertices={V} edges={E} density={graphDensity}
            cacheHits={cache.hits} cacheMisses={cache.misses} cacheSize={cache.size()}
            segUpdatesPerSec={segUpdates} rerouteTriggers={rerouteTriggers}
            activeAlgo={activeAlgo} nodesExplored={primary?.nodesExplored ?? 0}
            responseMs={responseMs} fwIterations={fw.iterations}
            concurrentUsers={concurrentUsers} predictionConfidence={predictionConfidence}
          />

          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Live alerts</div>
            <AlertsFeed alerts={alerts} onDismiss={(id) => setAlerts(a => a.filter(x => x.id !== id))} />
          </div>
        </div>
      </motion.aside>

      {/* Bottom legend */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 z-30 -translate-x-1/2">
        <div className="glass pointer-events-auto flex items-center gap-4 rounded-full px-5 py-2 text-[11px] shadow-xl">
          <Dot c="#22c55e" l="Optimal" />
          <Dot c="#f59e0b" l="Alt 1" />
          <Dot c="#ef4444" l="Congested" />
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">Dijkstra · Floyd–Warshall · Segment tree · DP cache · Greedy reroute</span>
        </div>
      </div>
    </div>
  );
}

function Dot({ c, l }: { c: string; l: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: c, boxShadow: `0 0 8px ${c}` }} />
      <span>{l}</span>
    </span>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { CityMap } from "@/components/CityMap";
import { ControlPanel } from "@/components/ControlPanel";
import { AnalyticsPanel } from "@/components/AnalyticsPanel";
import { AlertsFeed, type Alert } from "@/components/AlertsFeed";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Activity, Moon, Sun, Zap, Clock, Star } from "lucide-react";
import { buildCity, dijkstra, kAlternatives, peakFactorFor, RouteCache, type DijkstraResult, type Edge } from "@/lib/traffic-engine";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UrbanFlow AI — Predictive route optimization" },
      { name: "description", content: "Real-time traffic intelligence with Dijkstra routing, segment-tree updates, and predictive peak-hour modeling." },
      { property: "og:title", content: "UrbanFlow AI — Predictive route optimization" },
      { property: "og:description", content: "A smarter, faster Google Maps built on graph algorithms and predictive traffic modeling." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { nodes, edges: initialEdges } = useMemo(() => buildCity(), []);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [source, setSource] = useState<string | null>("n_0_0");
  const [destination, setDestination] = useState<string | null>("n_5_4");
  const [avoidTraffic, setAvoidTraffic] = useState(true);
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [fastest, setFastest] = useState(true);
  const [hour, setHour] = useState(9);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [favorites, setFavorites] = useState<{ id: string; src: string; dst: string }[]>([]);
  const [density, setDensity] = useState<{ t: number; v: number }[]>(() =>
    Array.from({ length: 30 }, (_, i) => ({ t: i, v: 0.3 }))
  );
  const [travelTimes, setTravelTimes] = useState<{ t: number; v: number }[]>(() =>
    Array.from({ length: 30 }, (_, i) => ({ t: i, v: 0 }))
  );
  const cacheRef = useRef(new RouteCache());
  const tickRef = useRef(0);

  // theme switching
  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  const peak = peakFactorFor(hour);

  // primary + alternatives
  const alternatives = useMemo(() => {
    if (!source || !destination) return [];
    return kAlternatives(nodes, edges, source, destination, 3, peak, { avoidTraffic });
  }, [nodes, edges, source, destination, peak, avoidTraffic]);

  const primary: DijkstraResult | null = useMemo(() => {
    if (!source || !destination) return null;
    const cache = cacheRef.current;
    const key = cache.key(source, destination, peak, { avoidTraffic });
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    const r = dijkstra(nodes, edges, source, destination, peak, { avoidTraffic });
    cache.set(key, r);
    return r;
  }, [nodes, edges, source, destination, peak, avoidTraffic]);

  // Real-time traffic simulation: random walk + decay (segment-tree style point updates).
  useEffect(() => {
    const id = setInterval(() => {
      tickRef.current += 1;
      setEdges(prev => {
        const next = prev.map(e => {
          let c = e.congestion + (Math.random() - 0.5) * 0.08;
          c = Math.max(0, Math.min(1, c * 0.96));
          return { ...e, congestion: c };
        });
        return next;
      });
      cacheRef.current = new RouteCache(); // invalidate
    }, 1500);
    return () => clearInterval(id);
  }, []);

  // density + travel-time charts
  useEffect(() => {
    const avg = edges.reduce((s, e) => s + e.congestion, 0) / edges.length;
    setDensity(d => [...d.slice(1), { t: tickRef.current, v: Number(avg.toFixed(3)) }]);
    setTravelTimes(d => [...d.slice(1), { t: tickRef.current, v: primary ? Math.round(primary.totalTime) : 0 }]);
  }, [edges, primary]);

  // random alerts
  useEffect(() => {
    const id = setInterval(() => {
      const r = Math.random();
      if (r < 0.55) return;
      const kinds: Alert["kind"][] = ["accident", "closure", "spike"];
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      const e = edges[Math.floor(Math.random() * edges.length)];
      const a = nodes.find(n => n.id === e.from)!; const b = nodes.find(n => n.id === e.to)!;
      const msg = `${a.label} -> ${b.label}`;
      const newAlert: Alert = { id: `${Date.now()}_${Math.random()}`, kind, message: msg, ts: Date.now() };
      setAlerts(prev => [newAlert, ...prev].slice(0, 5));
      if (kind === "closure") {
        setEdges(prev => prev.map(x => x.id === e.id ? { ...x, closed: true } : x));
        setTimeout(() => setEdges(prev => prev.map(x => x.id === e.id ? { ...x, closed: false } : x)), 9000);
      } else if (kind === "spike") {
        setEdges(prev => prev.map(x => x.id === e.id ? { ...x, congestion: Math.min(1, x.congestion + 0.5) } : x));
      }
    }, 6000);
    return () => clearInterval(id);
  }, [edges, nodes]);

  const handleNodeClick = (id: string) => {
    if (!source || (source && destination)) {
      setSource(id); setDestination(null);
    } else if (source && !destination && id !== source) {
      setDestination(id);
    }
  };

  const onOptimize = () => {
    cacheRef.current = new RouteCache();
    setEdges(e => [...e]); // trigger
  };

  const saveFavorite = () => {
    if (!source || !destination) return;
    const id = `${source}_${destination}`;
    if (favorites.find(f => f.id === id)) return;
    setFavorites([{ id, src: source, dst: destination }, ...favorites].slice(0, 4));
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Top bar */}
      <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between p-4">
        <div className="glass flex items-center gap-3 rounded-2xl px-4 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
            <Activity className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">UrbanFlow AI</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Predictive routing</div>
          </div>
        </div>

        <div className="glass flex items-center gap-3 rounded-2xl px-3 py-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <div className="w-48">
            <Slider value={[hour]} min={0} max={23.99} step={0.25} onValueChange={v => setHour(v[0])} />
          </div>
          <div className="w-16 text-right text-xs tabular-nums text-muted-foreground">
            {String(Math.floor(hour)).padStart(2, "0")}:{String(Math.floor((hour % 1) * 60)).padStart(2, "0")}
          </div>
          <div className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
            Peak x{peak.toFixed(2)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="glass border-border/40 h-10 w-10">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {/* Map */}
      <main className="absolute inset-0">
        <CityMap nodes={nodes} edges={edges} primary={primary} alternatives={alternatives}
          source={source} destination={destination} onNodeClick={handleNodeClick} />
      </main>

      {/* Left panel */}
      <aside className="absolute left-4 top-24 bottom-4 z-20 w-[340px] animate-float-in">
        <div className="glass flex h-full flex-col rounded-2xl p-4">
          <ControlPanel
            nodes={nodes}
            source={source} destination={destination}
            setSource={setSource} setDestination={setDestination}
            avoidTraffic={avoidTraffic} setAvoidTraffic={setAvoidTraffic}
            avoidTolls={avoidTolls} setAvoidTolls={setAvoidTolls}
            fastest={fastest} setFastest={setFastest}
            onOptimize={onOptimize}
          />

          <div className="my-4 border-t border-border/60" />

          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saved routes</h3>
            <button onClick={saveFavorite} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80">
              <Star className="h-3 w-3" /> Save
            </button>
          </div>
          <div className="mt-2 space-y-1.5 overflow-y-auto">
            {favorites.length === 0 && (
              <div className="text-xs text-muted-foreground">Pin frequently used routes for one-tap recall.</div>
            )}
            {favorites.map(f => {
              const a = nodes.find(n => n.id === f.src)!; const b = nodes.find(n => n.id === f.dst)!;
              return (
                <button key={f.id} onClick={() => { setSource(f.src); setDestination(f.dst); }}
                  className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-background/30 px-3 py-2 text-left text-xs hover:bg-accent/10">
                  <span className="truncate">{a.label} → {b.label}</span>
                  <Zap className="h-3 w-3 text-primary" />
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Right panel */}
      <aside className="absolute right-4 top-24 bottom-4 z-20 w-[340px] animate-float-in">
        <div className="glass flex h-full flex-col gap-4 overflow-y-auto rounded-2xl p-4">
          <AnalyticsPanel primary={primary} alternatives={alternatives} density={density} travelTimes={travelTimes} />
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live alerts</h3>
            <AlertsFeed alerts={alerts} onDismiss={(id) => setAlerts(a => a.filter(x => x.id !== id))} />
          </div>
        </div>
      </aside>

      {/* Bottom legend */}
      <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 animate-float-in">
        <div className="glass flex items-center gap-4 rounded-full px-5 py-2 text-xs">
          <LegendDot color="var(--color-traffic-low)" label="Low traffic" />
          <LegendDot color="var(--color-traffic-mid)" label="Moderate" />
          <LegendDot color="var(--color-traffic-high)" label="Heavy" />
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">Dijkstra · Segment updates · DP cache · Peak-hour predictor</span>
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      <span>{label}</span>
    </span>
  );
}

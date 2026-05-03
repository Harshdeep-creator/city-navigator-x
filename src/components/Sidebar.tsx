import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Node } from "@/lib/traffic-engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowRight, ChevronLeft, ChevronRight, MapPin, Navigation, Sparkles } from "lucide-react";

type Mode = "fastest" | "shortest" | "predictive";

type Props = {
  nodes: Node[];
  source: string | null; destination: string | null;
  setSource: (id: string | null) => void;
  setDestination: (id: string | null) => void;
  avoidTraffic: boolean; setAvoidTraffic: (v: boolean) => void;
  avoidTolls: boolean; setAvoidTolls: (v: boolean) => void;
  mode: Mode; setMode: (m: Mode) => void;
  onOptimize: () => void;
};

function Autocomplete({ nodes, value, onChange, placeholder, dot }: {
  nodes: Node[]; value: string | null; onChange: (id: string) => void; placeholder: string; dot: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const selected = nodes.find(n => n.id === value);
  const matches = useMemo(() => {
    const s = q.toLowerCase();
    return nodes.filter(n => n.label.toLowerCase().includes(s) || (n.zone ?? "").toLowerCase().includes(s)).slice(0, 7);
  }, [q, nodes]);
  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/40 px-3 py-2.5 transition focus-within:border-primary/50 focus-within:bg-background/60">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: dot, boxShadow: `0 0 10px ${dot}` }} />
        <Input
          value={open ? q : (selected?.label ?? "")}
          placeholder={placeholder}
          onFocus={() => { setOpen(true); setQ(""); }}
          onChange={e => setQ(e.target.value)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="h-6 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
        />
        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <AnimatePresence>
        {open && matches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-border/70 bg-popover/95 shadow-xl backdrop-blur"
          >
            {matches.map(n => (
              <button key={n.id}
                onMouseDown={() => { onChange(n.id); setOpen(false); setQ(""); }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent/15">
                <span className="font-medium">{n.label}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{n.zone}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Sidebar(p: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const modes: { id: Mode; label: string }[] = [
    { id: "fastest", label: "Fastest" },
    { id: "shortest", label: "Shortest" },
    { id: "predictive", label: "Predictive" },
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 60 : 320 }}
      transition={{ type: "spring", stiffness: 220, damping: 28 }}
      className="pointer-events-auto relative z-30 flex h-full flex-col"
    >
      <div className="glass m-3 flex h-[calc(100%-1.5rem)] flex-col rounded-2xl p-3 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 overflow-hidden ${collapsed ? "w-0" : ""}`}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
              <Navigation className="h-4 w-4" />
            </div>
            {!collapsed && (
              <div>
                <div className="text-sm font-semibold tracking-tight">Plan a route</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Delhi NCR</div>
              </div>
            )}
          </div>
          <button onClick={() => setCollapsed(c => !c)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-background/40 text-muted-foreground hover:text-foreground">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {!collapsed && (
          <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
            <div className="space-y-2">
              <Autocomplete nodes={p.nodes} value={p.source} onChange={p.setSource} placeholder="Source" dot="#22c55e" />
              <div className="flex justify-center"><ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /></div>
              <Autocomplete nodes={p.nodes} value={p.destination} onChange={p.setDestination} placeholder="Destination" dot="#a855f7" />
            </div>

            <div>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Route mode</div>
              <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-border/60 bg-background/30 p-1">
                {modes.map(m => (
                  <button key={m.id} onClick={() => p.setMode(m.id)}
                    className={`rounded-lg px-2 py-1.5 text-[11px] font-medium transition ${
                      p.mode === m.id ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
                    }`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5 rounded-xl border border-border/60 bg-background/30 p-3">
              <Toggle label="Avoid heavy traffic" value={p.avoidTraffic} onChange={p.setAvoidTraffic} />
              <Toggle label="Avoid tolls" value={p.avoidTolls} onChange={p.setAvoidTolls} />
            </div>

            <Button onClick={p.onOptimize} disabled={!p.source || !p.destination}
              className="w-full gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg hover:opacity-95">
              <Sparkles className="h-4 w-4" /> Optimize route
            </Button>

            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Click any junction on the map to set source, then destination. Routes update live as congestion shifts.
            </p>
          </div>
        )}
      </div>
    </motion.aside>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-xs">{label}</Label>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

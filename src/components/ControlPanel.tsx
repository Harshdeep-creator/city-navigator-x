import { useMemo, useState } from "react";
import type { Node } from "@/lib/traffic-engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowRight, Navigation, MapPin, Sparkles } from "lucide-react";

type Props = {
  nodes: Node[];
  source: string | null;
  destination: string | null;
  setSource: (id: string | null) => void;
  setDestination: (id: string | null) => void;
  avoidTraffic: boolean; setAvoidTraffic: (v: boolean) => void;
  avoidTolls: boolean; setAvoidTolls: (v: boolean) => void;
  fastest: boolean; setFastest: (v: boolean) => void;
  onOptimize: () => void;
};

function NodeAutocomplete({ nodes, value, onChange, placeholder, color }: {
  nodes: Node[]; value: string | null; onChange: (id: string | null) => void; placeholder: string; color: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const selected = nodes.find(n => n.id === value);
  const matches = useMemo(() => {
    const s = (q || (selected ? "" : "")).toLowerCase();
    return nodes.filter(n => n.label.toLowerCase().includes(s)).slice(0, 6);
  }, [q, nodes, selected]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2 focus-within:ring-2 focus-within:ring-ring/40">
        <MapPin className="h-4 w-4" style={{ color }} />
        <Input
          value={selected && !open ? selected.label : q}
          placeholder={placeholder}
          onFocus={() => { setOpen(true); setQ(""); }}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="h-7 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
        />
      </div>
      {open && matches.length > 0 && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover/95 backdrop-blur shadow-lg animate-float-in">
          {matches.map(n => (
            <button key={n.id}
              onMouseDown={() => { onChange(n.id); setOpen(false); setQ(""); }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent/20">
              <span>{n.label}</span>
              <span className="text-xs text-muted-foreground">{n.id.replace("n_", "")}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ControlPanel(p: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Navigation className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Plan a route</h2>
          <p className="text-xs text-muted-foreground">Adaptive, predictive routing</p>
        </div>
      </div>

      <div className="space-y-2">
        <NodeAutocomplete nodes={p.nodes} value={p.source} onChange={p.setSource}
          placeholder="From — pick a starting point" color="var(--color-primary)" />
        <div className="flex justify-center">
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <NodeAutocomplete nodes={p.nodes} value={p.destination} onChange={p.setDestination}
          placeholder="To — pick a destination" color="var(--color-accent)" />
      </div>

      <div className="space-y-2 rounded-lg border border-border/60 bg-background/30 p-3">
        <Toggle label="Avoid heavy traffic" value={p.avoidTraffic} onChange={p.setAvoidTraffic} />
        <Toggle label="Avoid tolls" value={p.avoidTolls} onChange={p.setAvoidTolls} />
        <Toggle label={p.fastest ? "Fastest route" : "Shortest route"} value={p.fastest} onChange={p.setFastest} />
      </div>

      <Button onClick={p.onOptimize} disabled={!p.source || !p.destination}
        className="w-full gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground glow hover:opacity-95">
        <Sparkles className="h-4 w-4" />
        Optimize route
      </Button>

      <p className="text-[11px] text-muted-foreground">
        Tip: click any intersection on the map to set your source, then your destination.
      </p>
    </div>
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

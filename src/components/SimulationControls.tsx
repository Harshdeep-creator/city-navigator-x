import { CloudRain, Construction, Flame, Sparkles, Briefcase, AlertTriangle } from "lucide-react";

export type SimFlags = {
  rain: boolean;
  festival: boolean;
  accidentInject: boolean;
  roadblock: boolean;
  peakOffice: boolean;
};

export function SimulationControls({
  flags, setFlags,
}: { flags: SimFlags; setFlags: (f: SimFlags) => void }) {
  const items: { key: keyof SimFlags; label: string; icon: any; color: string }[] = [
    { key: "rain", label: "Heavy rain", icon: CloudRain, color: "#38bdf8" },
    { key: "festival", label: "Festival load", icon: Sparkles, color: "#a855f7" },
    { key: "peakOffice", label: "Peak office", icon: Briefcase, color: "#f59e0b" },
    { key: "accidentInject", label: "Inject accident", icon: AlertTriangle, color: "#ef4444" },
    { key: "roadblock", label: "Roadblock", icon: Construction, color: "#fb923c" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map(it => {
        const Icon = it.icon;
        const active = flags[it.key];
        return (
          <button key={it.key} onClick={() => setFlags({ ...flags, [it.key]: !active })}
            className={`group flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition ${
              active
                ? "border-primary/60 bg-primary/15 shadow-[0_0_24px_-6px_var(--color-primary)]"
                : "border-border/60 bg-background/30 hover:border-border"
            }`}>
            <span className="flex h-7 w-7 items-center justify-center rounded-md"
              style={{ background: `color-mix(in oklab, ${it.color} 22%, transparent)`, color: it.color }}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-[11px] font-medium">{it.label}</div>
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{active ? "Active" : "Off"}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

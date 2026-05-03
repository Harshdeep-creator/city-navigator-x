import { AlertTriangle, Construction, TrendingUp, X } from "lucide-react";

export type Alert = {
  id: string;
  kind: "accident" | "closure" | "spike";
  message: string;
  ts: number;
};

const META = {
  accident: { icon: AlertTriangle, color: "var(--color-traffic-high)", label: "Accident" },
  closure:  { icon: Construction, color: "var(--color-traffic-mid)",  label: "Road closure" },
  spike:    { icon: TrendingUp,   color: "var(--color-accent)",       label: "Congestion spike" },
};

export function AlertsFeed({ alerts, onDismiss }: { alerts: Alert[]; onDismiss: (id: string) => void }) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
        No incidents on the network. Routes are flowing.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {alerts.map(a => {
        const m = META[a.kind];
        const Icon = m.icon;
        return (
          <div key={a.id} className="animate-float-in flex items-start gap-2 rounded-lg border border-border/60 bg-background/40 p-2.5">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
              style={{ background: `color-mix(in oklab, ${m.color} 20%, transparent)`, color: m.color }}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium">{m.label}</div>
              <div className="truncate text-xs text-muted-foreground">{a.message}</div>
            </div>
            <button onClick={() => onDismiss(a.id)} className="rounded p-1 text-muted-foreground hover:bg-accent/20 hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

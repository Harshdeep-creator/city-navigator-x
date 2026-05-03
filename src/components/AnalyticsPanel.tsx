import { useMemo } from "react";
import type { DijkstraResult } from "@/lib/traffic-engine";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from "recharts";

type Props = {
  primary: DijkstraResult | null;
  alternatives: DijkstraResult[];
  density: { t: number; v: number }[];
  travelTimes: { t: number; v: number }[];
};

export function AnalyticsPanel({ primary, alternatives, density, travelTimes }: Props) {
  const altData = useMemo(() => alternatives.map((a, i) => ({
    name: i === 0 ? "Best" : `Alt ${i}`,
    time: Math.round(a.totalTime),
    traffic: Math.round(a.trafficScore * 100),
  })), [alternatives]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="ETA" value={primary ? `${Math.round(primary.totalTime)}m` : "—"} />
        <Stat label="Distance" value={primary ? `${(primary.distance / 100).toFixed(1)} km` : "—"} />
        <Stat label="Traffic" value={primary ? `${Math.round(primary.trafficScore * 100)}` : "—"} accent />
      </div>

      <Card title="Network density">
        <div className="h-24">
          <ResponsiveContainer>
            <AreaChart data={density}>
              <defs>
                <linearGradient id="dGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke="var(--color-primary)" fill="url(#dGrad)" strokeWidth={2} isAnimationActive={false} />
              <XAxis dataKey="t" hide /><YAxis hide domain={[0, 1]} />
              <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Your ETA over time">
        <div className="h-24">
          <ResponsiveContainer>
            <AreaChart data={travelTimes}>
              <defs>
                <linearGradient id="tGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke="var(--color-accent)" fill="url(#tGrad)" strokeWidth={2} isAnimationActive={false} />
              <XAxis dataKey="t" hide /><YAxis hide />
              <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {altData.length > 0 && (
        <Card title="Route comparison">
          <div className="h-28">
            <ResponsiveContainer>
              <BarChart data={altData}>
                <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="time" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="traffic" fill="var(--color-accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/30 p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-lg font-semibold tabular-nums ${accent ? "text-accent" : ""}`}>{value}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/30 p-3">
      <div className="mb-1 text-xs font-medium text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

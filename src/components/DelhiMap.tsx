import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, Marker, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import type { Node, Edge, DijkstraResult } from "@/lib/traffic-engine";
import { trafficColor } from "@/lib/traffic-engine";

type Incident = { id: string; kind: "accident" | "closure" | "spike"; lat: number; lng: number };

type Props = {
  nodes: Node[];
  edges: Edge[];
  primary?: DijkstraResult | null;
  alternatives?: DijkstraResult[];
  source?: string | null;
  destination?: string | null;
  incidents?: Incident[];
  theme: "dark" | "light";
  onNodeClick?: (id: string) => void;
};

const DELHI_CENTER: [number, number] = [28.6139, 77.2090];

function FlyTo({ src, dst, nodes }: { src?: string | null; dst?: string | null; nodes: Node[] }) {
  const map = useMap();
  useEffect(() => {
    if (src && dst) {
      const a = nodes.find(n => n.id === src);
      const b = nodes.find(n => n.id === dst);
      if (a && b) {
        const bounds = L.latLngBounds([a.lat, a.lng], [b.lat, b.lng]).pad(0.4);
        map.flyToBounds(bounds, { duration: 1.2 });
      }
    }
  }, [src, dst, nodes, map]);
  return null;
}

function MovingVehicle({ path, nodes }: { path: string[]; nodes: Node[] }) {
  const [pos, setPos] = useState<[number, number] | null>(null);
  const tRef = useRef(0);
  const coords = useMemo(() => path.map(id => {
    const n = nodes.find(x => x.id === id)!;
    return [n.lat, n.lng] as [number, number];
  }), [path, nodes]);

  useEffect(() => {
    if (coords.length < 2) return;
    tRef.current = 0;
    let raf = 0;
    const step = () => {
      tRef.current += 0.004;
      const t = tRef.current % 1;
      const seg = t * (coords.length - 1);
      const i = Math.floor(seg);
      const f = seg - i;
      const a = coords[i], b = coords[Math.min(i + 1, coords.length - 1)];
      setPos([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [coords]);

  if (!pos) return null;
  const icon = L.divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;border-radius:50%;background:#22d3ee;border:3px solid #fff;box-shadow:0 0 18px #22d3ee,0 0 4px #000;"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
  return <Marker position={pos} icon={icon} interactive={false} />;
}

export default function DelhiMap({ nodes, edges, primary, alternatives = [], source, destination, incidents = [], theme, onNodeClick }: Props) {
  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
  const altRoutes = alternatives.slice(1, 3);
  const altColors = ["#f59e0b", "#ef4444"];

  const tileUrl = theme === "dark"
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  return (
    <MapContainer center={DELHI_CENTER} zoom={11} className="h-full w-full" zoomControl={false} attributionControl={false} preferCanvas>
      <TileLayer url={tileUrl} subdomains={["a", "b", "c", "d"]} />
      <FlyTo src={source} dst={destination} nodes={nodes} />

      {/* base edges with congestion color */}
      {edges.map(e => {
        const a = nodeMap.get(e.from)!; const b = nodeMap.get(e.to)!;
        return (
          <Polyline key={e.id}
            positions={[[a.lat, a.lng], [b.lat, b.lng]]}
            pathOptions={{
              color: e.closed ? "#475569" : trafficColor(e.congestion),
              weight: e.isHighway ? 5 : 3,
              opacity: e.closed ? 0.5 : 0.55,
              dashArray: e.closed ? "6 8" : undefined,
            }}
          />
        );
      })}

      {/* congestion heatmap circles */}
      {edges.filter(e => e.congestion > 0.6 && !e.closed).map(e => {
        const a = nodeMap.get(e.from)!; const b = nodeMap.get(e.to)!;
        const mid: [number, number] = [(a.lat + b.lat) / 2, (a.lng + b.lng) / 2];
        return (
          <Circle key={"hm_" + e.id} center={mid} radius={700 * e.congestion}
            pathOptions={{ color: "transparent", fillColor: "#ef4444", fillOpacity: 0.15 }} />
        );
      })}

      {/* alternatives */}
      {altRoutes.map((r, i) => (
        <Polyline key={"alt_" + i}
          positions={r.path.map(id => { const n = nodeMap.get(id)!; return [n.lat, n.lng] as [number, number]; })}
          pathOptions={{ color: altColors[i], weight: 5, opacity: 0.65, dashArray: "8 10" }} />
      ))}

      {/* primary route — green optimal */}
      {primary && (
        <>
          <Polyline positions={primary.path.map(id => { const n = nodeMap.get(id)!; return [n.lat, n.lng] as [number, number]; })}
            pathOptions={{ color: "#0ea5e9", weight: 11, opacity: 0.25 }} />
          <Polyline positions={primary.path.map(id => { const n = nodeMap.get(id)!; return [n.lat, n.lng] as [number, number]; })}
            pathOptions={{ color: "#22c55e", weight: 6, opacity: 0.95 }} />
          <MovingVehicle path={primary.path} nodes={nodes} />
        </>
      )}

      {/* nodes */}
      {nodes.map(n => {
        const isSrc = n.id === source;
        const isDst = n.id === destination;
        const isOnPath = primary?.path.includes(n.id);
        return (
          <CircleMarker key={n.id} center={[n.lat, n.lng]}
            radius={isSrc || isDst ? 9 : isOnPath ? 5 : 3.5}
            pathOptions={{
              color: "#0f172a",
              weight: 1.5,
              fillColor: isSrc ? "#22c55e" : isDst ? "#a855f7" : isOnPath ? "#f8fafc" : "#cbd5e1",
              fillOpacity: 1,
            }}
            eventHandlers={{ click: () => onNodeClick?.(n.id) }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
              <span style={{ fontSize: 11, fontWeight: 600 }}>{n.label}</span>
              {n.zone && <span style={{ fontSize: 10, opacity: 0.7 }}> · {n.zone}</span>}
            </Tooltip>
          </CircleMarker>
        );
      })}

      {/* incidents */}
      {incidents.map(inc => {
        const color = inc.kind === "accident" ? "#ef4444" : inc.kind === "closure" ? "#f59e0b" : "#a855f7";
        const symbol = inc.kind === "accident" ? "!" : inc.kind === "closure" ? "✕" : "▲";
        const icon = L.divIcon({
          className: "",
          html: `<div style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:${color};color:#0f172a;font-weight:800;font-size:13px;border:2px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.35);">${symbol}</div>`,
          iconSize: [24, 24], iconAnchor: [12, 12],
        });
        return <Marker key={inc.id} position={[inc.lat, inc.lng]} icon={icon} interactive={false} />;
      })}
    </MapContainer>
  );
}

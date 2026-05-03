import { lazy, Suspense, useEffect, useState } from "react";
import type { ComponentProps } from "react";

const DelhiMap = lazy(() => import("./DelhiMap"));

export function MapCanvas(props: ComponentProps<typeof DelhiMap>) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) {
    return <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">Loading Delhi map…</div>;
  }
  return (
    <Suspense fallback={<div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">Loading map…</div>}>
      <DelhiMap {...props} />
    </Suspense>
  );
}

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Code2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const SNIPPETS: { id: string; title: string; code: string }[] = [
  {
    id: "dijkstra",
    title: "Dijkstra (binary heap, O((V+E) log V))",
    code: `// UrbanFlow - Dijkstra shortest path on weighted directed graph
#include <bits/stdc++.h>
using namespace std;

vector<int> dijkstra(int src, int n,
                     const vector<vector<pair<int,double>>>& adj) {
    vector<double> dist(n, 1e18);
    vector<int> prev(n, -1);
    priority_queue<pair<double,int>, vector<pair<double,int>>,
                   greater<>> pq;
    dist[src] = 0; pq.push({0, src});
    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (d > dist[u]) continue;            // stale entry
        for (auto [v, w] : adj[u]) {
            double nd = d + w;                // w = baseTime * (1 + congestion * peak)
            if (nd < dist[v]) {
                dist[v] = nd; prev[v] = u;
                pq.push({nd, v});
            }
        }
    }
    return prev;                              // reconstruct path via prev[]
}`,
  },
  {
    id: "floyd",
    title: "Floyd–Warshall (all-pairs, O(V³))",
    code: `// Pre-compute all-pairs shortest distances for analytics dashboard.
#include <bits/stdc++.h>
using namespace std;

void floydWarshall(vector<vector<double>>& d) {
    int n = d.size();
    for (int k = 0; k < n; ++k)
        for (int i = 0; i < n; ++i)
            for (int j = 0; j < n; ++j)
                if (d[i][k] + d[k][j] < d[i][j])
                    d[i][j] = d[i][k] + d[k][j];
}`,
  },
  {
    id: "segtree",
    title: "Segment Tree with Lazy Propagation (range congestion)",
    code: `// Range-add / range-max segment tree to push live congestion bursts
// onto contiguous road segments (e.g., NH-48 corridor) in O(log N).
#include <bits/stdc++.h>
using namespace std;

struct SegTree {
    int n; vector<double> t, lz;
    SegTree(int n): n(n), t(4*n,0), lz(4*n,0) {}
    void push(int x) {
        if (lz[x]) {
            for (int c : {2*x, 2*x+1}) { t[c] += lz[x]; lz[c] += lz[x]; }
            lz[x] = 0;
        }
    }
    void add(int x,int l,int r,int ql,int qr,double v){
        if (qr<l||r<ql) return;
        if (ql<=l&&r<=qr){ t[x]+=v; lz[x]+=v; return; }
        push(x); int m=(l+r)/2;
        add(2*x,l,m,ql,qr,v); add(2*x+1,m+1,r,ql,qr,v);
        t[x]=max(t[2*x],t[2*x+1]);
    }
    double qmax(int x,int l,int r,int ql,int qr){
        if (qr<l||r<ql) return -1e18;
        if (ql<=l&&r<=qr) return t[x];
        push(x); int m=(l+r)/2;
        return max(qmax(2*x,l,m,ql,qr), qmax(2*x+1,m+1,r,ql,qr));
    }
};`,
  },
  {
    id: "greedy",
    title: "Greedy K-alternative reroute",
    code: `// Generate K diverse alternatives by banning the median edge of each
// previous route (Yen-lite). Runs K Dijkstras, O(K (V+E) log V).
#include <bits/stdc++.h>
using namespace std;

vector<vector<int>> kAlternatives(int s,int t,int K,
        vector<vector<pair<int,double>>> adj) {
    vector<vector<int>> routes;
    set<pair<int,int>> banned;
    for (int i = 0; i < K; ++i) {
        auto path = dijkstraPath(s, t, adj, banned);   // helper
        if (path.empty()) break;
        routes.push_back(path);
        auto e = path[path.size()/2];                  // median edge
        banned.insert({e.first, e.second});
    }
    return routes;
}`,
  },
  {
    id: "dp",
    title: "DP route memoization (LRU cache)",
    code: `// Memoize (src, dst, peak, opts) -> Route. LRU eviction at capacity.
template<class K,class V>
struct LRU {
    int cap; list<pair<K,V>> dq;
    unordered_map<K, typename list<pair<K,V>>::iterator> mp;
    LRU(int c): cap(c) {}
    optional<V> get(const K& k){
        auto it = mp.find(k); if (it==mp.end()) return {};
        dq.splice(dq.begin(), dq, it->second);
        return it->second->second;
    }
    void put(const K& k, V v){
        if (mp.count(k)){ mp[k]->second = v;
            dq.splice(dq.begin(), dq, mp[k]); return; }
        dq.push_front({k,v}); mp[k] = dq.begin();
        if ((int)dq.size() > cap){
            mp.erase(dq.back().first); dq.pop_back();
        }
    }
};`,
  },
];

export function CppReferenceButton() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(SNIPPETS[0].id);
  const snippet = SNIPPETS.find(s => s.id === active)!;

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline"
        className="glass h-10 gap-2 border-border/40">
        <Code2 className="h-4 w-4" /> C++ engine
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="glass relative flex h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border/60"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                <div>
                  <div className="text-sm font-semibold">UrbanFlow C++ Engine</div>
                  <div className="text-[11px] text-muted-foreground">Reference implementations powering the live dashboard</div>
                </div>
                <button onClick={() => setOpen(false)} className="rounded-md p-1.5 hover:bg-accent/20">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-1 overflow-hidden">
                <div className="w-56 shrink-0 space-y-1 border-r border-border/60 p-3">
                  {SNIPPETS.map(s => (
                    <button key={s.id} onClick={() => setActive(s.id)}
                      className={`w-full rounded-lg px-2.5 py-2 text-left text-[12px] transition ${
                        active === s.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                      }`}>
                      {s.title.split(" (")[0]}
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-auto">
                  <div className="border-b border-border/60 bg-background/30 px-4 py-2 text-xs font-semibold">
                    {snippet.title}
                  </div>
                  <pre className="p-4 text-[11.5px] leading-relaxed text-foreground/90">
                    <code>{snippet.code}</code>
                  </pre>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

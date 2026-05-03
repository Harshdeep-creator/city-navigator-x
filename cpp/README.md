# UrbanFlow AI — C++ Core Engine

This directory contains the **complete logical core** of UrbanFlow AI rewritten
in modern C++17. The browser frontend (React/Leaflet) is purely a visual layer —
all routing, predictive modeling, congestion updates, caching and analytics
are implemented here in C++ so you can compile, run, and demonstrate the
algorithms directly to a teacher / examiner.

## What's inside

| File | Concept | Complexity |
|------|---------|------------|
| `include/graph.hpp` / `src/graph.cpp` | Delhi NCR weighted graph model | — |
| `include/dijkstra.hpp` / `src/dijkstra.cpp` | **Dijkstra** with binary min-heap | `O((V+E) log V)` |
| `include/floyd_warshall.hpp` / `src/floyd_warshall.cpp` | **Floyd–Warshall** all-pairs shortest path | `O(V³)` |
| `include/segment_tree.hpp` / `src/segment_tree.cpp` | **Segment Tree + lazy propagation** for range congestion bursts | `O(log N)` per update/query |
| `include/lru_cache.hpp` | **DP route memoization** via LRU cache | `O(1)` amortized |
| `include/k_alternatives.hpp` / `src/k_alternatives.cpp` | **Greedy K-alternative** routing (Yen-lite) | `O(K (V+E) log V)` |
| `include/peak_model.hpp` / `src/peak_model.cpp` | Predictive **peak-hour DP table** | `O(1)` lookup |
| `src/main.cpp` | End-to-end demo: builds Delhi graph, runs all 5 algorithms | — |

## Build

```bash
cd cpp
g++ -std=c++17 -O2 -Iinclude src/*.cpp -o urbanflow
./urbanflow
```

The demo prints:
1. Graph summary (V, E, density)
2. Fastest route Dwarka → Noida Sec 62 at 9:30 AM (peak)
3. Same route at 2 AM (off-peak) — shows predictive model
4. K=3 greedy alternatives
5. Segment-tree range-congestion burst on NH-48 corridor + reroute
6. Floyd–Warshall APSP diagnostic stats
7. LRU cache hit-rate after repeated queries

## Mapping to the web app

The TypeScript engine in `src/lib/traffic-engine.ts` is a **direct port** of
this C++ code — same data structures, same algorithms, same edge weights.
The C++ version is the canonical reference implementation; the TS version
exists only because browsers cannot run native code.

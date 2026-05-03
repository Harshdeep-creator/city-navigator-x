// UrbanFlow AI — C++ demo driver.
// Builds the Delhi NCR graph and exercises every algorithm.
#include "graph.hpp"
#include "dijkstra.hpp"
#include "floyd_warshall.hpp"
#include "segment_tree.hpp"
#include "k_alternatives.hpp"
#include "lru_cache.hpp"

#include <chrono>
#include <iomanip>
#include <iostream>
#include <sstream>

using namespace urbanflow;

static std::string keyOf(int s, int d, double peak, const RouteOpts& o) {
    std::ostringstream os;
    os << s << '|' << d << '|' << std::fixed << std::setprecision(2) << peak
       << '|' << o.avoidTraffic << o.avoidTolls << o.fastest
       << '|' << o.weatherMult << '|' << o.festivalMult;
    return os.str();
}

static void printRoute(const Graph& g, const RouteResult& r, const char* tag) {
    std::cout << "  [" << tag << "] ";
    if (!r.found) { std::cout << "NO PATH\n"; return; }
    for (size_t i = 0; i < r.pathNodes.size(); ++i) {
        std::cout << g.nodes[r.pathNodes[i]].label;
        if (i + 1 < r.pathNodes.size()) std::cout << " -> ";
    }
    std::cout << "\n        ETA=" << std::fixed << std::setprecision(1)
              << r.totalTime << " min, dist=" << r.distance
              << " km, congestion=" << std::setprecision(2) << r.trafficScore
              << ", explored=" << r.nodesExplored
              << (r.hasToll ? ", toll" : "") << "\n";
}

int main() {
    std::cout << std::fixed;

    // 1. Graph
    Graph g = buildDelhi();
    std::cout << "=== UrbanFlow AI — C++ engine ===\n";
    std::cout << "Vertices=" << g.nodes.size()
              << "  Edges=" << g.edges.size()
              << "  Density=" << std::setprecision(3) << g.density() << "\n\n";

    int src = g.idToIndex.at("dw");   // Dwarka
    int dst = g.idToIndex.at("n62");  // Noida Sec 62
    RouteOpts opts; opts.fastest = true; opts.avoidTraffic = true;

    // 2. Dijkstra at peak (9:30)
    auto t0 = std::chrono::steady_clock::now();
    RouteResult peakRoute = dijkstra(g, src, dst, peakFactorFor(9.5), opts);
    auto t1 = std::chrono::steady_clock::now();
    double ms = std::chrono::duration<double, std::milli>(t1 - t0).count();
    std::cout << "[1] Dijkstra @ 09:30 peak (" << std::setprecision(3)
              << ms << " ms):\n";
    printRoute(g, peakRoute, "PEAK");

    // 3. Same query off-peak (02:00) — predictive model
    RouteResult offRoute = dijkstra(g, src, dst, peakFactorFor(2.0), opts);
    std::cout << "\n[2] Dijkstra @ 02:00 off-peak:\n";
    printRoute(g, offRoute, "OFF ");

    // 4. Greedy K=3 alternatives
    std::cout << "\n[3] Greedy K=3 alternatives @ 09:30:\n";
    auto alts = kAlternatives(g, src, dst, 3, peakFactorFor(9.5), opts);
    for (size_t i = 0; i < alts.size(); ++i) {
        std::string tag = "ALT" + std::to_string(i + 1);
        printRoute(g, alts[i], tag.c_str());
    }

    // 5. Segment tree: range congestion burst on NH-48 corridor
    std::cout << "\n[4] Segment-tree range burst on NH-48 corridor:\n";
    std::vector<double> congArr(g.edges.size());
    for (size_t i = 0; i < g.edges.size(); ++i) congArr[i] = g.edges[i].congestion;
    SegmentTree seg(congArr);
    int lo = -1, hi = -1;
    for (size_t i = 0; i < g.edges.size(); ++i) {
        const auto& e = g.edges[i];
        bool nh48 = (g.nodes[e.from].zone == "South-West" || g.nodes[e.to].zone == "South-West"
                  || g.nodes[e.from].zone == "Gurgaon"   || g.nodes[e.to].zone == "Gurgaon")
                  && e.isHighway;
        if (nh48) { if (lo < 0) lo = (int)i; hi = (int)i; }
    }
    if (lo >= 0) {
        std::cout << "  pre-burst max congestion in [" << lo << "," << hi << "] = "
                  << std::setprecision(2) << seg.rangeMax(lo, hi) << "\n";
        seg.rangeAdd(lo, hi, 0.45);
        std::cout << "  post-burst max congestion = " << seg.rangeMax(lo, hi) << "\n";
        // Apply burst to graph and reroute
        for (int i = lo; i <= hi; ++i) g.edges[i].congestion = seg.pointGet(i);
        RouteResult rerouted = dijkstra(g, src, dst, peakFactorFor(9.5), opts);
        std::cout << "  reroute after burst:\n";
        printRoute(g, rerouted, "REROUTE");
    }

    // 6. Floyd–Warshall APSP
    std::cout << "\n[5] Floyd–Warshall APSP:\n";
    auto t2 = std::chrono::steady_clock::now();
    APSPResult apsp = floydWarshall(g);
    auto t3 = std::chrono::steady_clock::now();
    double diameter = 0;
    for (auto& row : apsp.dist) for (double v : row)
        if (std::isfinite(v) && v > diameter) diameter = v;
    std::cout << "  iterations=" << apsp.iterations
              << ", network diameter=" << std::setprecision(1) << diameter
              << " min, time="
              << std::chrono::duration<double, std::milli>(t3 - t2).count()
              << " ms\n";

    // 7. LRU cache hit-rate demo
    std::cout << "\n[6] LRU route cache (capacity=64):\n";
    LRUCache<std::string, RouteResult> cache(64);
    int queries = 200, computed = 0;
    std::vector<std::pair<int,int>> pairs = {
        {g.idToIndex.at("dw"),  g.idToIndex.at("n62")},
        {g.idToIndex.at("igi"), g.idToIndex.at("cp")},
        {g.idToIndex.at("gcc"), g.idToIndex.at("av")},
        {g.idToIndex.at("rh"),  g.idToIndex.at("fb")},
    };
    for (int q = 0; q < queries; ++q) {
        auto [s, d] = pairs[q % pairs.size()];
        auto k = keyOf(s, d, peakFactorFor(9.5), opts);
        if (auto v = cache.get(k); !v) {
            cache.put(k, dijkstra(g, s, d, peakFactorFor(9.5), opts));
            ++computed;
        }
    }
    double hitRate = 100.0 * cache.hitCount() / (cache.hitCount() + cache.missCount());
    std::cout << "  queries=" << queries
              << "  computed=" << computed
              << "  hits=" << cache.hitCount()
              << "  misses=" << cache.missCount()
              << "  hit-rate=" << std::setprecision(1) << hitRate << "%\n";

    std::cout << "\nDone.\n";
    return 0;
}

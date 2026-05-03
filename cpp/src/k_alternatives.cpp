#include "k_alternatives.hpp"

namespace urbanflow {

std::vector<RouteResult> kAlternatives(const Graph& g, int src, int dst,
                                       int k, double peak,
                                       const RouteOpts& opts) {
    std::vector<RouteResult> out;
    std::unordered_set<std::string> banned;
    for (int i = 0; i < k; ++i) {
        RouteResult r = dijkstra(g, src, dst, peak, opts, banned);
        if (!r.found) break;
        out.push_back(r);
        if (r.pathEdges.empty()) break;
        const Edge& mid = g.edges[r.pathEdges[r.pathEdges.size() / 2]];
        banned.insert(mid.id);
    }
    return out;
}

} // namespace urbanflow

#include "dijkstra.hpp"
#include <algorithm>
#include <cmath>
#include <queue>
#include <vector>
#include <limits>

namespace urbanflow {

RouteResult dijkstra(const Graph& g, int src, int dst,
                     double peak, const RouteOpts& opts,
                     const std::unordered_set<std::string>& banned) {
    const int n = static_cast<int>(g.nodes.size());
    const double INF = std::numeric_limits<double>::infinity();

    std::vector<double> dist(n, INF);
    std::vector<int>    prevNode(n, -1);
    std::vector<int>    prevEdge(n, -1);
    std::vector<char>   seen(n, 0);

    using QE = std::pair<double,int>; // (dist, node)
    std::priority_queue<QE, std::vector<QE>, std::greater<QE>> pq;

    dist[src] = 0.0;
    pq.push({0.0, src});

    int explored = 0;
    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (seen[u]) continue;
        seen[u] = 1; ++explored;
        if (u == dst) break;

        for (int eIdx : g.adj[u]) {
            const Edge& e = g.edges[eIdx];
            if (banned.count(e.id)) continue;
            int v = (e.from == u) ? e.to : e.from;
            double w = edgeWeight(e, peak, opts);
            double nd = d + w;
            if (nd < dist[v]) {
                dist[v] = nd;
                prevNode[v] = u;
                prevEdge[v] = eIdx;
                pq.push({nd, v});
            }
        }
    }

    RouteResult r;
    r.nodesExplored = explored;
    if (!std::isfinite(dist[dst])) return r;

    // Reconstruct path
    for (int cur = dst; cur != -1; cur = prevNode[cur]) {
        r.pathNodes.push_back(cur);
        if (prevEdge[cur] != -1) r.pathEdges.push_back(prevEdge[cur]);
    }
    std::reverse(r.pathNodes.begin(), r.pathNodes.end());
    std::reverse(r.pathEdges.begin(), r.pathEdges.end());

    double cong = 0.0;
    RouteOpts fastestOpts = opts; fastestOpts.fastest = true;
    for (int eIdx : r.pathEdges) {
        const Edge& e = g.edges[eIdx];
        r.distance  += e.distanceKm;
        r.totalTime += edgeWeight(e, peak, fastestOpts);
        cong += e.congestion;
        if (e.toll) r.hasToll = true;
    }
    if (!r.pathEdges.empty()) r.trafficScore = cong / r.pathEdges.size();
    r.found = true;
    return r;
}

} // namespace urbanflow

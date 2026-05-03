// Dijkstra single-source shortest path with a binary min-heap.
// Complexity: O((V + E) log V).
#pragma once
#include "graph.hpp"
#include "peak_model.hpp"
#include <unordered_set>
#include <string>
#include <vector>

namespace urbanflow {

struct RouteResult {
    std::vector<int> pathNodes;   // node indices, src .. dst
    std::vector<int> pathEdges;   // edge indices, in order
    double totalTime = 0;         // minutes
    double distance  = 0;         // km
    double trafficScore = 0;      // mean congestion on path
    int    nodesExplored = 0;
    bool   hasToll = false;
    bool   found = false;
};

RouteResult dijkstra(const Graph& g, int src, int dst,
                     double peak, const RouteOpts& opts,
                     const std::unordered_set<std::string>& bannedEdgeIds = {});

} // namespace urbanflow

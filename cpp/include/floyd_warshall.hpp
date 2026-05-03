// Floyd–Warshall all-pairs shortest path. O(V^3).
#pragma once
#include "graph.hpp"
#include <vector>

namespace urbanflow {

struct APSPResult {
    std::vector<std::vector<double>> dist;
    long long iterations;
};

APSPResult floydWarshall(const Graph& g);

} // namespace urbanflow

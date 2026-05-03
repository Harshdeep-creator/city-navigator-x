// Greedy K-alternative routes (Yen-lite): repeatedly run Dijkstra,
// banning the median edge of each previous route to force diversity.
// Complexity: O(K (V + E) log V).
#pragma once
#include "dijkstra.hpp"
#include <vector>

namespace urbanflow {

std::vector<RouteResult> kAlternatives(const Graph& g, int src, int dst,
                                       int k, double peak,
                                       const RouteOpts& opts);

} // namespace urbanflow

#include "floyd_warshall.hpp"
#include <limits>
#include <algorithm>

namespace urbanflow {

APSPResult floydWarshall(const Graph& g) {
    const int n = static_cast<int>(g.nodes.size());
    const double INF = std::numeric_limits<double>::infinity();
    APSPResult res;
    res.dist.assign(n, std::vector<double>(n, INF));
    for (int i = 0; i < n; ++i) res.dist[i][i] = 0.0;
    for (const auto& e : g.edges) {
        double w = e.baseTime;
        res.dist[e.from][e.to] = std::min(res.dist[e.from][e.to], w);
        res.dist[e.to][e.from] = std::min(res.dist[e.to][e.from], w);
    }
    for (int k = 0; k < n; ++k)
        for (int i = 0; i < n; ++i)
            for (int j = 0; j < n; ++j)
                if (res.dist[i][k] + res.dist[k][j] < res.dist[i][j])
                    res.dist[i][j] = res.dist[i][k] + res.dist[k][j];
    res.iterations = static_cast<long long>(n) * n * n;
    return res;
}

} // namespace urbanflow

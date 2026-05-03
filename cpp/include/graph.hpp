// UrbanFlow AI — Delhi NCR weighted graph model.
#pragma once
#include <string>
#include <vector>
#include <unordered_map>

namespace urbanflow {

struct Node {
    std::string id;
    std::string label;
    double lat;
    double lng;
    std::string zone;
};

struct Edge {
    std::string id;
    int from;          // index into Graph::nodes
    int to;
    double distanceKm;
    double baseTime;   // minutes in free-flow
    double congestion; // 0..1
    bool isHighway;
    bool toll;
    bool closed;
};

struct Graph {
    std::vector<Node> nodes;
    std::vector<Edge> edges;
    std::unordered_map<std::string, int> idToIndex;
    // adjacency: node index -> list of edge indices
    std::vector<std::vector<int>> adj;

    int addNode(const Node& n);
    int addEdge(const std::string& fromId, const std::string& toId,
                bool isHighway, bool toll);
    double density() const;
};

// Build the canonical Delhi NCR network used by the dashboard.
Graph buildDelhi();

// Great-circle distance in km.
double haversineKm(const Node& a, const Node& b);

} // namespace urbanflow

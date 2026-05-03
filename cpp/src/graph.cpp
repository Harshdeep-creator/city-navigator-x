#include "graph.hpp"
#include <cmath>
#include <random>
#include <tuple>

namespace urbanflow {

static constexpr double PI = 3.14159265358979323846;

double haversineKm(const Node& a, const Node& b) {
    const double R = 6371.0;
    double dLat = (b.lat - a.lat) * PI / 180.0;
    double dLng = (b.lng - a.lng) * PI / 180.0;
    double la1 = a.lat * PI / 180.0;
    double la2 = b.lat * PI / 180.0;
    double x = std::sin(dLat / 2) * std::sin(dLat / 2)
             + std::cos(la1) * std::cos(la2)
             * std::sin(dLng / 2) * std::sin(dLng / 2);
    return 2 * R * std::asin(std::sqrt(x));
}

int Graph::addNode(const Node& n) {
    int idx = static_cast<int>(nodes.size());
    nodes.push_back(n);
    idToIndex[n.id] = idx;
    adj.emplace_back();
    return idx;
}

int Graph::addEdge(const std::string& fromId, const std::string& toId,
                   bool isHighway, bool toll) {
    int a = idToIndex.at(fromId);
    int b = idToIndex.at(toId);
    double km = haversineKm(nodes[a], nodes[b]);
    double speed = isHighway ? 65.0 : 32.0; // km/h
    static std::mt19937 rng(42);
    std::uniform_real_distribution<double> jitter(0.0, 0.3);

    Edge e;
    e.id = fromId + "__" + toId;
    e.from = a; e.to = b;
    e.distanceKm = km;
    e.baseTime = (km / speed) * 60.0;
    e.congestion = 0.2 + jitter(rng);
    e.isHighway = isHighway;
    e.toll = toll;
    e.closed = false;

    int idx = static_cast<int>(edges.size());
    edges.push_back(e);
    adj[a].push_back(idx);
    adj[b].push_back(idx); // undirected
    return idx;
}

double Graph::density() const {
    double v = static_cast<double>(nodes.size());
    if (v < 2) return 0.0;
    return (2.0 * edges.size()) / (v * (v - 1.0));
}

Graph buildDelhi() {
    Graph g;
    auto N = [&](const char* id, const char* label, double lat, double lng,
                 const char* zone) {
        g.addNode({id, label, lat, lng, zone});
    };
    N("cp",   "Connaught Place",     28.6315, 77.2167, "Central");
    N("ig",   "India Gate",          28.6129, 77.2295, "Central");
    N("kb",   "Karol Bagh",          28.6519, 77.1909, "Central");
    N("cl",   "Civil Lines",         28.6776, 77.2243, "North");
    N("od",   "Old Delhi Stn",       28.6608, 77.2280, "Central");
    N("ch",   "Chanakyapuri",        28.5946, 77.1904, "Central");
    N("aiims","AIIMS",               28.5672, 77.2100, "South");
    N("hk",   "Hauz Khas",           28.5494, 77.2001, "South");
    N("sk",   "Saket",               28.5244, 77.2066, "South");
    N("vk",   "Vasant Kunj",         28.5200, 77.1592, "South-West");
    N("ln",   "Lajpat Nagar",        28.5707, 77.2373, "South");
    N("np",   "Nehru Place",         28.5494, 77.2519, "South");
    N("mv",   "Mayur Vihar",         28.6094, 77.2950, "East");
    N("av",   "Anand Vihar",         28.6469, 77.3157, "East");
    N("sh",   "Shahdara",            28.6735, 77.2885, "East");
    N("rj",   "Rajouri Garden",      28.6469, 77.1207, "West");
    N("jp",   "Janakpuri",           28.6219, 77.0878, "West");
    N("dw",   "Dwarka",              28.5921, 77.0460, "South-West");
    N("igi",  "IGI Airport",         28.5562, 77.1000, "South-West");
    N("rh",   "Rohini",              28.7041, 77.1025, "North-West");
    N("pt",   "Pitampura",           28.6973, 77.1325, "North-West");
    N("gcc",  "Gurgaon Cyber City",  28.4951, 77.0890, "Gurgaon");
    N("gmg",  "MG Road Gurgaon",     28.4796, 77.0813, "Gurgaon");
    N("n18",  "Noida Sec 18",        28.5707, 77.3260, "Noida");
    N("n62",  "Noida Sec 62",        28.6280, 77.3649, "Noida");
    N("gn",   "Greater Noida",       28.4744, 77.5040, "Noida");
    N("fb",   "Faridabad",           28.4089, 77.3178, "Faridabad");
    N("gz",   "Ghaziabad",           28.6692, 77.4538, "Ghaziabad");

    using E = std::tuple<const char*, const char*, bool, bool>; // hw, toll
    std::vector<E> defs = {
        {"cp","ig",false,false},{"cp","kb",false,false},{"cp","od",false,false},
        {"cp","cl",false,false},{"cp","ch",false,false},
        {"ig","ch",false,false},{"ig","ln",false,false},{"ig","aiims",false,false},
        {"kb","rj",false,false},{"kb","od",false,false},{"cl","od",false,false},
        {"cl","sh",false,false},{"od","sh",false,false},{"sh","av",false,false},
        {"av","n62",true,false},{"av","gz",true,true},
        {"mv","ln",false,false},{"mv","n18",true,false},{"mv","av",false,false},
        {"ch","aiims",false,false},{"aiims","hk",false,false},{"hk","sk",false,false},
        {"hk","ln",false,false},{"sk","vk",false,false},{"sk","np",false,false},
        {"np","ln",false,false},{"np","mv",false,false},
        {"vk","igi",true,false},{"vk","gcc",true,true},
        {"rj","jp",false,false},{"jp","dw",false,false},{"dw","igi",true,false},
        {"igi","gcc",true,true},{"gcc","gmg",false,false},
        {"rj","pt",false,false},{"pt","rh",false,false},{"rh","cl",true,false},
        {"pt","kb",false,false},{"n18","n62",false,false},{"n18","gn",true,true},
        {"n62","gz",false,false},{"fb","sk",true,true},{"fb","n18",true,false},
        {"gn","fb",true,true},{"gmg","fb",true,true},
    };
    for (auto& [a,b,hw,toll] : defs) g.addEdge(a, b, hw, toll);
    return g;
}

} // namespace urbanflow

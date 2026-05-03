#include "peak_model.hpp"
#include "graph.hpp"
#include <array>
#include <cmath>
#include <limits>

namespace urbanflow {

static std::array<double,24> buildTable() {
    std::array<double,24> t{};
    for (int h = 0; h < 24; ++h) {
        double m = std::exp(-std::pow(h - 9.5, 2) / 5.0)
                 + std::exp(-std::pow(h - 18.5, 2) / 4.5);
        t[h] = 1.0 + m * 0.95;
    }
    return t;
}
static const std::array<double,24> PEAK_TABLE = buildTable();

double peakFactorFor(double hour) {
    double h = std::fmod(std::fmod(hour, 24.0) + 24.0, 24.0);
    int lo = static_cast<int>(std::floor(h));
    int hi = (lo + 1) % 24;
    double f = h - lo;
    return PEAK_TABLE[lo] * (1.0 - f) + PEAK_TABLE[hi] * f;
}

double edgeWeight(const Edge& e, double peak, const RouteOpts& opts) {
    if (e.closed) return std::numeric_limits<double>::infinity();
    if (opts.avoidTolls && e.toll) return e.distanceKm * 60.0; // strong penalty
    double traffic = 1.0 + e.congestion * 1.6 * peak
                         * opts.weatherMult * opts.festivalMult;
    double avoidance = opts.avoidTraffic ? (1.0 + e.congestion * 1.4) : 1.0;
    if (!opts.fastest) return e.distanceKm; // shortest-distance mode
    return e.baseTime * traffic * avoidance;
}

} // namespace urbanflow

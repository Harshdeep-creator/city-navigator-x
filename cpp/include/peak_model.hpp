// Predictive peak-hour multiplier built from a precomputed DP table
// (sum of two Gaussians centered at 9:30 and 18:30).
#pragma once

namespace urbanflow {

struct RouteOpts {
    bool avoidTraffic = false;
    bool avoidTolls   = false;
    bool fastest      = true;
    double weatherMult  = 1.0;  // e.g. heavy rain
    double festivalMult = 1.0;  // e.g. festival load
};

// 0 <= hour < 24 (fractional allowed)
double peakFactorFor(double hour);

struct Edge; // fwd decl

double edgeWeight(const struct Edge& e, double peak, const RouteOpts& opts);

} // namespace urbanflow

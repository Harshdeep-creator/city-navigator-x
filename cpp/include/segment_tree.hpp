// Segment tree with lazy propagation for range-add / range-max.
// Used to push live congestion bursts onto contiguous road corridors
// (e.g., NH-48) in O(log N) per update.
#pragma once
#include <vector>

namespace urbanflow {

class SegmentTree {
public:
    explicit SegmentTree(const std::vector<double>& base);
    void   rangeAdd (int l, int r, double v);
    double rangeMax (int l, int r);
    double pointGet (int i) { return rangeMax(i, i); }

private:
    int n;
    std::vector<double> tree;
    std::vector<double> lazy;
    void build(int node, int l, int r, const std::vector<double>& a);
    void push(int node);
    void addImpl(int node, int nl, int nr, int l, int r, double v);
    double maxImpl(int node, int nl, int nr, int l, int r);
};

} // namespace urbanflow

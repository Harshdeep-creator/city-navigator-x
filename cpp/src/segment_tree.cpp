#include "segment_tree.hpp"
#include <algorithm>
#include <limits>

namespace urbanflow {

SegmentTree::SegmentTree(const std::vector<double>& base)
    : n(static_cast<int>(base.size())),
      tree(base.size() * 4, 0.0),
      lazy(base.size() * 4, 0.0) {
    if (n) build(1, 0, n - 1, base);
}

void SegmentTree::build(int node, int l, int r, const std::vector<double>& a) {
    if (l == r) { tree[node] = a[l]; return; }
    int m = (l + r) >> 1;
    build(node*2, l, m, a);
    build(node*2+1, m+1, r, a);
    tree[node] = std::max(tree[node*2], tree[node*2+1]);
}

void SegmentTree::push(int node) {
    if (lazy[node] != 0.0) {
        for (int c : {node*2, node*2+1}) {
            tree[c] += lazy[node];
            lazy[c] += lazy[node];
        }
        lazy[node] = 0.0;
    }
}

void SegmentTree::rangeAdd(int l, int r, double v) {
    if (n) addImpl(1, 0, n - 1, l, r, v);
}

void SegmentTree::addImpl(int node, int nl, int nr, int l, int r, double v) {
    if (r < nl || nr < l) return;
    if (l <= nl && nr <= r) { tree[node] += v; lazy[node] += v; return; }
    push(node);
    int m = (nl + nr) >> 1;
    addImpl(node*2, nl, m, l, r, v);
    addImpl(node*2+1, m+1, nr, l, r, v);
    tree[node] = std::max(tree[node*2], tree[node*2+1]);
}

double SegmentTree::rangeMax(int l, int r) {
    if (!n) return -std::numeric_limits<double>::infinity();
    return maxImpl(1, 0, n - 1, l, r);
}

double SegmentTree::maxImpl(int node, int nl, int nr, int l, int r) {
    if (r < nl || nr < l) return -std::numeric_limits<double>::infinity();
    if (l <= nl && nr <= r) return tree[node];
    push(node);
    int m = (nl + nr) >> 1;
    return std::max(
        maxImpl(node*2, nl, m, l, r),
        maxImpl(node*2+1, m+1, nr, l, r)
    );
}

} // namespace urbanflow

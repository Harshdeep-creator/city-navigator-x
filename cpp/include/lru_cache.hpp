// Generic LRU cache: O(1) amortized get/put using list + hash map.
// Used to memoize Dijkstra results keyed by (src, dst, peak, opts).
#pragma once
#include <list>
#include <unordered_map>
#include <optional>
#include <utility>

namespace urbanflow {

template <class K, class V>
class LRUCache {
public:
    explicit LRUCache(int capacity) : cap(capacity) {}

    std::optional<V> get(const K& key) {
        auto it = map.find(key);
        if (it == map.end()) { ++misses; return std::nullopt; }
        items.splice(items.begin(), items, it->second);
        ++hits;
        return it->second->second;
    }

    void put(const K& key, V value) {
        auto it = map.find(key);
        if (it != map.end()) {
            it->second->second = std::move(value);
            items.splice(items.begin(), items, it->second);
            return;
        }
        items.push_front({key, std::move(value)});
        map[key] = items.begin();
        if (static_cast<int>(items.size()) > cap) {
            map.erase(items.back().first);
            items.pop_back();
        }
    }

    int size() const { return static_cast<int>(items.size()); }
    long long hitCount()  const { return hits; }
    long long missCount() const { return misses; }

private:
    int cap;
    std::list<std::pair<K,V>> items;
    std::unordered_map<K, typename std::list<std::pair<K,V>>::iterator> map;
    long long hits = 0, misses = 0;
};

} // namespace urbanflow

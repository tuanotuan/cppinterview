# Day 31 — Unordered Containers, Hashing, reserve, and Load Factor

## 1. Problem It Solves

Ordered trees pay for sorting even when callers only need key lookup. Unordered containers place keys into buckets using a hash, compare equal keys inside candidate buckets, and expose reserve and load-factor controls for allocation planning.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 6 and 25-30: containers, key lookup, equality, allocation, capacity planning, and performance trade-offs.

## 3. Core Idea

Hash narrows the search to a bucket; equality confirms the key. `load_factor` is roughly elements divided by buckets, and reserving before insertion can reduce rehashing and iterator disruption.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
std::unordered_map<std::string, int> table;
table.max_load_factor(0.75f);
table.reserve(8);
```

## 5. How It Works

1. The map sets a target maximum load factor and requests capacity for expected elements before insertion.
2. Each string hash selects a bucket and equality distinguishes colliding keys; growth may rehash when the threshold is exceeded.
3. Three entries are found correctly and the printed check confirms the current load stays within the configured maximum.

## 6. Common Mistakes

- Providing a custom hash inconsistent with equality can make logically equal keys occupy incompatible lookup paths.
- Do not copy the pattern without checking hash/equality consistency, expected element count, rehash invalidation, collision quality, load factor, and measured access patterns. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when average constant-time key access matters and iteration order is irrelevant.
- Avoid it when stable sorted order, range queries, worst-case guarantees, or tiny data make a tree or flat sequence clearer.

## 8. Simple Example

A score table reserves room for eight keys, inserts three records, and looks up one by name. The program checks size, value, and the load-factor invariant rather than relying on bucket order.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- Unordered lookup requires both a good hash and equality consistent with that hash.
- Hash narrows the search to a bucket; equality confirms the key. `load_factor` is roughly elements divided by buckets, and reserving before insertion can reduce rehashing and iterator disruption.
- The compiler or library follows a precise rule; verify hash/equality consistency, expected element count, rehash invalidation, collision quality, load factor, and measured access patterns.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of Unordered Containers, Hashing, reserve, and Load Factor?
2. Medium — Why can the table print correct lookup results even though iteration order is unspecified?
3. Hard — What iterator and performance effects can occur when an insertion triggers `rehash`?

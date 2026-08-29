# Day 47 — Cache Locality and Data-Oriented Design

## 1. Problem It Solves

A correct algorithm can waste time waiting for memory when its working data is scattered or mixed with unused fields. Cache locality keeps nearby accesses in nearby memory, and data-oriented design arranges data around the operations that process it.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 24-26 and 45: layout, contiguous vectors, iteration, cache lines, false sharing, and profiling.

## 3. Core Idea

Ask what fields a hot loop reads together, then store and traverse those fields contiguously. Structure of arrays can be better than array of structures when one pass touches only selected components.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
std::vector<double> position{...};
std::vector<double> velocity{...};
for (std::size_t i = 0; i < position.size(); ++i)
    position[i] += velocity[i] * dt;
```

## 5. How It Works

1. Positions and velocities are stored in two contiguous arrays with matching indices.
2. The update loop streams through both arrays in order, giving hardware prefetching a simple access pattern.
3. All positions update deterministically, and the code exposes the exact fields touched by the hot loop.

## 6. Common Mistakes

- Reorganizing data for presumed cache gains without profiling can damage clarity and optimize the wrong loop.
- Do not copy the pattern without checking hot access pattern, contiguity, stride, working-set size, vectorization, branch behavior, and profiler cache metrics. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when profiling shows memory stalls in a hot loop over many similarly processed records.
- Avoid it when data volume is tiny or domain clarity and invariants matter more than an unmeasured layout change.

## 8. Simple Example

A position update touches only position and velocity arrays. Three particles move one time step, and output shows the new contiguous position values.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- Data-oriented design begins with measured access patterns, not with a fashionable layout.
- Ask what fields a hot loop reads together, then store and traverse those fields contiguously. Structure of arrays can be better than array of structures when one pass touches only selected components.
- The compiler or library follows a precise rule; verify hot access pattern, contiguity, stride, working-set size, vectorization, branch behavior, and profiler cache metrics.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of Cache Locality and Data-Oriented Design?
2. Medium — Which two arrays does the hot loop read or write on every iteration?
3. Hard — When could an array-of-structures layout outperform structure-of-arrays despite the latter's contiguous individual fields?

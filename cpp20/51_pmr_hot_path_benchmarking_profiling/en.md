# Day 51 — PMR, Allocation-Free Hot Paths, Benchmarking, and Profiling

## 1. Problem It Solves

A fixed PMR arena can remove heap allocation from a measured hot loop, while benchmarking measures a question and profiling locates system-wide cost. It makes an important assumption visible and checkable.

## 2. Prerequisites

- PMR resources, containers, cache behavior, and chrono timing.
- You should be able to compile a short program and read its output.

## 3. Core Idea

Prepare the workshop before timing: reserve storage from the arena, then measure only repeated work. A benchmark is a stopwatch; a profiler is a map. Read `std::pmr::monotonic_buffer_resource` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
std::pmr::monotonic_buffer_resource arena{buffer.data(), buffer.size(), std::pmr::null_memory_resource()};
```

## 5. How It Works

1. The program introduces the smallest relevant form of `std::pmr::monotonic_buffer_resource`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- A tiny timing can be optimized away, dominated by noise, or answer the wrong question; a null upstream resource throws if the fixed buffer is exhausted.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when allocation behavior is measured as a bottleneck and a bounded arena fits the lifetime.
- Avoid it when ordinary allocation is not hot or object lifetimes must outgrow the arena.

## 8. Simple Example

A PMR vector reserves from a stack buffer before timing, then updates elements in a hot path without further allocation. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `std::pmr::monotonic_buffer_resource` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `std::pmr::monotonic_buffer_resource` in the minimal example?
2. Medium — Why is `reserve` performed before the start timestamp?
3. Hard — How does using `null_memory_resource()` make an accidental buffer overflow visible instead of silently falling back to the heap?

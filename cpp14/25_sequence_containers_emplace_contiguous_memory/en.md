# Day 25 — Sequence Containers, emplace, and Contiguous Memory

## 1. Problem It Solves

Sequence containers share an ordered interface but have different storage and invalidation behavior. `std::vector` stores elements contiguously, while `emplace_back` constructs a new element directly from supplied constructor arguments.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 6 and 21: standard containers, constructors, iterators, moves, lifetime, and RAII.

## 3. Core Idea

Choose storage behavior first: vector is a growable array with cache-friendly adjacency. Reserve capacity when growth is predictable, then emplace only when direct construction makes intent clearer.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
std::vector<std::pair<int, std::string>> rows;
rows.reserve(2);
rows.emplace_back(1, "one");
```

## 5. How It Works

1. Reserving allocates enough contiguous capacity before any elements are inserted.
2. `emplace_back` forwards arguments to construct each pair in the vector's storage.
3. The sample prints both records and confirms that adjacent element addresses differ by exactly one element size.

## 6. Common Mistakes

- Treating `emplace_back` as always faster ignores conversions, readability, and reallocation; it can also call an unintended constructor.
- Do not copy the pattern without checking container storage guarantees, capacity growth, iterator invalidation, constructor overloads, and actual measurements. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when fast indexed traversal and contiguous storage matter, and elements are mostly added at the end.
- Avoid it when stable iterators under middle insertion or constant-time insertion at both ends is the dominant requirement.

## 8. Simple Example

A vector holds ID/name pairs. Capacity is reserved once, pairs are constructed from separate arguments, and pointer arithmetic demonstrates contiguous storage.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- Container choice determines memory layout and invalidation; emplacement only changes how one element is constructed.
- Choose storage behavior first: vector is a growable array with cache-friendly adjacency. Reserve capacity when growth is predictable, then emplace only when direct construction makes intent clearer.
- The compiler or library follows a precise rule; verify container storage guarantees, capacity growth, iterator invalidation, constructor overloads, and actual measurements.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of Sequence Containers, emplace, and Contiguous Memory?
2. Medium — Why does reserving capacity before two insertions help keep existing element addresses stable during those insertions?
3. Hard — When can `emplace_back(args...)` select a constructor or implicit conversion that `push_back(value)` would make more obvious?

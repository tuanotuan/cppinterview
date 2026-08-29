# Day 47 — Cache Locality and Data-Oriented Design

## 1. Problem It Solves

A correct algorithm can spend most of its time waiting for scattered memory or loading fields that a hot loop never uses. Data-oriented design arranges data around measured access patterns.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know contiguous vectors, structures, cache lines, profiling, iteration order, and vectorization basics.

## 3. Core Idea

Keep data read together close together and traverse it predictably. A structure-of-arrays layout can improve streaming when a pass touches only selected fields, while array-of-structures can remain better when whole records are consumed together.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
for (std::size_t i = 0; i < positions.size(); ++i) {
    positions[i] += velocities[i] * time_step;
}
```

## 5. How It Works

1. Positions and velocities are stored in parallel contiguous arrays with matching indices.
2. The update loop streams through exactly the two fields it needs, providing a simple prefetch and vectorization pattern.
3. The program prints `positions: 3 6 21`, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- Changing layout without profiling can damage invariants and readability while optimizing a cold path; cache behavior is hardware and workload dependent.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when profiling identifies memory stalls in a hot loop over many similarly processed records.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

Three position components advance by velocity times a fixed step. Only relevant arrays are touched in the hot loop.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- Data-oriented design starts with measured data movement and preserves domain invariants through explicit index relationships.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does Cache Locality and Data-Oriented Design address?
2. Medium — Which arrays are read or written on every iteration?
3. Hard — When can array-of-structures outperform structure-of-arrays for the same entities?

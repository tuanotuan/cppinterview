# Day 39 — Parallel Algorithms and Execution Policies

## 1. Problem It Solves

Data-parallel loops are difficult to schedule portably by hand. C++17 adds execution-policy overloads that let standard algorithms choose sequential, parallel, or parallel-unsequenced execution.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know standard algorithms, threads, data races, associativity, iterator categories, and performance measurement.

## 3. Core Idea

`std::execution::seq` requests sequencing, `par` permits multiple threads, and `par_unseq` additionally permits unsequenced vector-style execution. User operations must satisfy stricter independence, exception, and synchronization requirements.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
std::for_each(std::execution::par,
              values.begin(), values.end(),
              [](int& value) { value *= 2; });
```

## 5. How It Works

1. A parallel-policy algorithm doubles independent vector elements without sharing per-iteration state.
2. A parallel reduction computes an integer sum whose associative exact arithmetic makes regrouping harmless for this range.
3. The program prints `first: 0`, `last: 1998`, and `sum: 999000`, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- Capturing and mutating shared state creates races; exceptions under standard parallel policies can terminate the program, and small workloads may become slower.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when iterations are independent, operations tolerate regrouping, data is large enough, and benchmarking proves benefit.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

Each invocation touches only its assigned element. The final sum uses bounded integers so output is deterministic regardless of scheduling.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- An execution policy changes the callable contract as well as scheduling; prove safety before measuring speed.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does Parallel Algorithms and Execution Policies address?
2. Medium — Why is mutating each referenced vector element race-free in this call?
3. Hard — Which operations are forbidden or dangerous inside a `par_unseq` callable?

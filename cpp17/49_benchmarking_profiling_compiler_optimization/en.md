# Day 49 — Benchmarking, Profiling, and Compiler Optimization

## 1. Problem It Solves

Optimization by intuition frequently targets cold code or measures setup and noise. Benchmarks quantify controlled workloads, profilers locate real costs, and optimized builds reveal what the compiler can legally transform.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know steady clocks, optimization flags, observable behavior, repeated measurements, statistics, and representative inputs.

## 3. Core Idea

Start from a correct representative baseline. Isolate setup, repeat enough work, retain an observable result so optimization cannot erase it, compare identical conditions, and use a profiler to explain rather than guess about timing differences.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
const auto start = std::chrono::steady_clock::now();
// repeated measured work
const auto elapsed = std::chrono::steady_clock::now() - start;
```

## 5. How It Works

1. A vector is prepared before timing, then the same integer accumulation runs one thousand times.
2. A volatile checksum keeps every accumulated result observable, and a steady clock supplies a monotonic interval.
3. The program prints `checksum: 499500000` and a true nonnegative-duration property, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- One timing, debug-versus-release comparison, unequal setup, thermal changes, and synthetic data can all produce persuasive but wrong conclusions.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when a concrete performance decision matters and competing implementations can be measured under realistic conditions.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

Elapsed nanoseconds are intentionally not printed because machines differ; the invariant checksum and duration validity are stable test outputs.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- Benchmark numbers become evidence only with controlled workload, build, environment, statistics, and profiler corroboration.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does Benchmarking, Profiling, and Compiler Optimization address?
2. Medium — Why is the checksum deterministic while elapsed time is not?
3. Hard — How can dead-code elimination invalidate a benchmark whose result is never observed?

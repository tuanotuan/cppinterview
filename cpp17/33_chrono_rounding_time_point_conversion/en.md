# Day 33 — Chrono Rounding, floor, ceil, and Time-Point Conversion

## 1. Problem It Solves

Casting a duration simply truncates toward zero, but applications often need explicit floor, ceiling, or nearest rounding. C++17 adds named chrono rounding operations and makes intent visible.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know durations, periods, clocks, time points, and `duration_cast`.

## 3. Core Idea

`std::chrono::floor` selects the greatest target-duration value not exceeding the input, `ceil` selects the least not below it, and `round` chooses nearest with ties to even. Time points can be converted by transforming their duration since epoch.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
auto down = std::chrono::floor<std::chrono::seconds>(1501ms);
auto up = std::chrono::ceil<std::chrono::seconds>(1501ms);
```

## 5. How It Works

1. A fixed 1501-millisecond duration is rounded three ways to whole seconds.
2. A synthetic steady-clock time point uses the same epoch duration and is converted with `time_point_cast`.
3. The program prints `floor: 1`, `ceil: 2`, `round: 2`, and cast count 1, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- Negative durations expose the difference between floor and truncation; do not infer floor semantics from a positive-only example.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when time values must align to explicit scheduling, display, bucket, or timeout boundaries.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

No real clock is read, so every count is deterministic. Named operations document exactly which rounding policy is intended.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- Store time with chrono types, name the rounding policy, and postpone conversion to raw counts until an interface requires it.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does Chrono Rounding, floor, ceil, and Time-Point Conversion address?
2. Medium — What would floor and truncating cast produce for minus 1501 milliseconds?
3. Hard — Why can converting between time points from different clocks be conceptually invalid?

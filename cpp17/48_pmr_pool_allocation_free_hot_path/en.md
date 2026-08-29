# Day 48 — PMR Memory Pools and an Allocation-Free Hot Path

## 1. Problem It Solves

Repeated allocations in a latency-sensitive loop can add contention and unpredictable delays. A PMR pool can perform setup allocation ahead of time, while reserved containers reuse capacity inside the hot path.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know PMR resources from Day 40, reserve versus size, pool behavior, buffer exhaustion, and benchmarking.

## 3. Core Idea

`unsynchronized_pool_resource` reuses size-class blocks without internal locking and is suitable only under external single-thread ownership. Reserving vector capacity before the timed loop makes later clear-and-refill cycles avoid vector storage allocation while capacity is not exceeded.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
std::pmr::unsynchronized_pool_resource pool{&upstream};
std::pmr::vector<int> values{&pool};
values.reserve(32);
// hot path: clear and push at most 32 values
```

## 5. How It Works

1. A fixed byte buffer backs a monotonic upstream resource, which backs an unsynchronized pool and one PMR vector.
2. After reserve, repeated clear and push operations remain within the original vector capacity; a null upstream prevents hidden heap fallback.
3. The program prints `capacity stable: 1` and `sum: 496`, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- Capacity stability proves no vector reallocation, not that element constructors or called code allocate nothing; the complete hot path must be audited and measured.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when a single-threaded phase has bounded storage demand and measured allocation jitter.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

The hierarchy has explicit reverse-safe lifetimes. The final iteration stores zero through thirty-one, whose sum is 496.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- Move allocation out of hot paths only after bounding capacity, defining exhaustion behavior, and proving resource lifetime.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does PMR Memory Pools and an Allocation-Free Hot Path address?
2. Medium — Why does `clear` not reduce vector capacity?
3. Hard — How would a `std::bad_alloc` from the null upstream affect real-time guarantees?

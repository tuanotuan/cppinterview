# Day 44 — Atomic Operations, Compare-and-Swap, and Memory Ordering

## 1. Problem It Solves

Some shared state transitions need an indivisible read-modify-write without a mutex. Compare-and-swap conditionally updates an atomic only if its observed value still matches an expected value.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know atomics, data races, modification order, acquire/release, relaxed ordering, and retry loops.

## 3. Core Idea

`compare_exchange_weak` compares the atomic with `expected`; success stores the desired value, while failure writes the current value back into `expected`. Weak CAS may fail spuriously, so loops retry.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
int expected = counter.load(std::memory_order_relaxed);
while (!counter.compare_exchange_weak(
    expected, expected + 1,
    std::memory_order_relaxed)) {}
```

## 5. How It Works

1. Two threads repeatedly increment one atomic counter with CAS retry loops.
2. Relaxed ordering is sufficient because only the counter's indivisible final value matters; no other payload is published through it.
3. The program prints `counter: 2000`, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- Failing to account for `expected` being overwritten can corrupt retry logic; relaxed CAS cannot publish unrelated non-atomic data.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when a small atomic state machine is proven correct and contention measurements justify avoiding a mutex.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

Each successful CAS contributes exactly one increment. Thread joins establish when the main thread may print the completed result.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- Choose memory order from cross-object visibility requirements; atomicity alone does not define a complete protocol.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does Atomic Operations, Compare-and-Swap, and Memory Ordering address?
2. Medium — Why may a weak compare-exchange loop retry even without another writer?
3. Hard — What additional ordering would be required if the counter also published a payload?

# Day 45 — Hardware Interference Size, False Sharing, and std::launder

## 1. Problem It Solves

Independent atomics placed on one cache line can invalidate each other's caches, while reusing storage for a new object can leave old pointers outside the language's lifetime model. C++17 provides vocabulary for both boundaries.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know cache coherence, alignment, object lifetime, placement new, explicit destruction, and undefined behavior.

## 3. Core Idea

`hardware_destructive_interference_size` estimates spacing that avoids destructive sharing, while the constructive value estimates data that benefits from co-location. `std::launder` obtains a pointer usable for a newly created object in cases where an old pointer cannot transparently retarget.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
alignas(std::hardware_destructive_interference_size)
std::atomic<int> counter;
T* current = std::launder(old_pointer);
```

## 5. How It Works

1. The program checks that standard interference-size hints are positive, without printing implementation-dependent byte counts.
2. Aligned raw storage hosts one const-member object, ends its lifetime, hosts a replacement, and obtains a pointer with `std::launder`.
3. The program prints `interference hints: 1` and `replacement: 2`, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- Interference sizes are implementation hints rather than universal cache-line constants, and launder never repairs misalignment, missing construction, or an unrelated object type.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when profiling confirms false sharing or advanced storage reuse follows a formally reviewed lifetime design.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

The lifetime example follows placement construction and explicit destruction exactly. Ordinary application code should prefer RAII containers instead.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- Hardware layout hints require measurement, and storage reuse requires exact language-level lifetime correctness.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does Hardware Interference Size, False Sharing, and std::launder address?
2. Medium — Why is the interference-size output a Boolean instead of a byte count?
3. Hard — Which transparent-replacement restrictions make `std::launder` relevant for a const-member object?

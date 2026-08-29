# Day 41 — std::shared_mutex and std::scoped_lock

## 1. Problem It Solves

Read-heavy state can unnecessarily serialize all readers behind an exclusive mutex, while acquiring several mutexes manually risks inconsistent order and deadlock. C++17 standardizes shared ownership and variadic scoped locking.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know mutex RAII, data races, reader/writer access patterns, lock ordering, and exception safety.

## 3. Core Idea

`std::shared_mutex` permits multiple shared readers or one exclusive writer. `std::shared_lock` owns shared access, while `std::scoped_lock` can acquire several mutexes with a deadlock-avoidance algorithm and releases them by RAII.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
std::shared_lock read{mutex};
std::unique_lock write{mutex};
std::scoped_lock both{left_mutex, right_mutex};
```

## 5. How It Works

1. A protected score is written under exclusive ownership and read under shared ownership.
2. A transfer then acquires two account mutexes in one scoped lock before changing both balances atomically with respect to other locked access.
3. The program prints `score: 91` and final balances `70, 80`, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- A shared mutex does not make referenced data safe after the lock is released, and mixed manual acquisition can reintroduce deadlock around scoped code.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when measurements show read concurrency matters or one invariant spans several separately protected objects.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

The operations run deterministically, focusing on ownership modes and multi-lock RAII rather than timing-dependent output.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- Choose lock granularity from invariants, and keep every reference to protected state inside the owning lock scope.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does std::shared_mutex and std::scoped_lock address?
2. Medium — Why must both account mutexes be held throughout the transfer?
3. Hard — When can a reader-writer mutex perform worse than an ordinary mutex?

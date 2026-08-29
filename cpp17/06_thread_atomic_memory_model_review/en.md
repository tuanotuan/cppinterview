# Day 6 — Reviewing Threads, Atomics, and the C++ Memory Model

## 1. Problem It Solves

Two threads accessing shared state without ordering can create a data race and undefined behavior. Atomics provide indivisible operations and memory-order relationships that can publish ordinary data safely.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Understand thread creation, joining, shared objects, and the difference between atomicity and mutual exclusion.

## 3. Core Idea

A release store synchronizes with an acquire load that observes it. Writes sequenced before release become visible after matching acquire, creating a `happens-before` edge without making the payload atomic.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
payload = 42;
ready.store(true, std::memory_order_release);
while (!ready.load(std::memory_order_acquire)) {}
use(payload);
```

## 5. How It Works

1. The producer writes a non-atomic integer and then publishes readiness with a release store.
2. The consumer spins with acquire loads; after observing true it may read the payload because synchronization orders the accesses.
3. The program prints `payload: 42` after both threads are joined, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- Relaxing either side without another synchronization mechanism can remove the visibility guarantee even though the flag access remains atomic.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when a small one-way publication protocol has a rigorously documented synchronization edge.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

One producer publishes a fixed payload to one consumer. Real work queues also need blocking, backoff, ownership rules, and shutdown handling.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- Atomics prevent races only when every shared access participates in a correct protocol; memory ordering is part of that protocol.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does Reviewing Threads, Atomics, and the C++ Memory Model address?
2. Medium — Which write becomes visible after the acquire load observes the release store?
3. Hard — Which synchronizes-with and happens-before relations make the non-atomic payload race-free?

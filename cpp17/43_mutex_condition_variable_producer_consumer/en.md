# Day 43 — Mutexes, Condition Variables, and Producer-Consumer Design

## 1. Problem It Solves

Consumers should sleep while a queue is empty rather than spin, yet wakeups must not lose state changes or race with shutdown. A condition variable coordinates waiting around a mutex-protected predicate.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know mutex ownership, RAII locks, queues, threads, predicates, and spurious wakeups.

## 3. Core Idea

The mutex protects both queue and completion flag. A consumer waits with a predicate equivalent to `!queue.empty() || done`; the wait atomically releases the mutex while sleeping and reacquires it before returning.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
condition.wait(lock, [&] { return !queue.empty() || done; });
```

## 5. How It Works

1. The producer pushes three fixed jobs while holding the lock and notifies after each state change.
2. The consumer loops on the predicate, removes work under the mutex, and exits only when the queue is empty and completion is true.
3. The program prints `processed sum: 60`, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- Waiting without a predicate is vulnerable to spurious or missed-condition reasoning, and reading the completion flag outside its synchronization creates a race.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when threads exchange bounded-latency work through shared state and blocking is preferable to spinning.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

One producer and one consumer use a single queue and a clear shutdown flag. Only the final deterministic sum is printed.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- Condition variables wait for predicates, not notifications; the predicate and every field it reads need one synchronization discipline.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does Mutexes, Condition Variables, and Producer-Consumer Design address?
2. Medium — Why must the consumer test both queue state and completion?
3. Hard — Why is changing the predicate state before notification the crucial ordering pattern?

# Day 41 — Counting and Binary Semaphores

## 1. Problem It Solves

Semaphores control access through permits: counting form represents several available slots, while binary form represents at most one. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Threads, counters, blocking, and synchronization.
- You should be able to compile a short program and read its output.

## 3. Core Idea

Imagine a bowl of tokens. `acquire` takes one and may wait; `release` returns tokens. A binary semaphore is a bowl whose capacity is one. Read `std::counting_semaphore` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
std::counting_semaphore<2> slots{1};
slots.acquire();
slots.release();
```

## 5. How It Works

1. The program introduces the smallest relevant form of `std::counting_semaphore`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- Releasing beyond the permitted maximum violates preconditions, and semaphores do not automatically protect a complex data invariant.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when you limit concurrent users of a resource or send a simple availability signal.
- Avoid it when one owner must protect structured shared state, where a mutex is clearer.

## 8. Simple Example

The single-thread example deterministically acquires and releases counting and binary permits without timing dependence. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `std::counting_semaphore` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `std::counting_semaphore` in the minimal example?
2. Medium — What happens to `acquire` when the current permit count is zero?
3. Hard — Why can a binary semaphore signal an event but still be the wrong primitive for protecting several related fields?

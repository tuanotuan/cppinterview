# Day 6 — Threads, Atomics, and the C++ Memory Model

## 1. Problem It Solves

Concurrent threads may access shared state at the same time, so the program needs defined rules for visibility and ordering. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Functions, lambdas, object lifetime, and RAII.
- You should be able to compile a short program and read its output.

## 3. Core Idea

Imagine each thread has its own desk. An atomic operation is a synchronized mailbox, and the memory model defines which writes another desk is guaranteed to see. Read `std::atomic` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
std::atomic<int> counter{0};
counter.fetch_add(1);
```

## 5. How It Works

1. The program introduces the smallest relevant form of `std::atomic`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- Unsynchronized conflicting access to a non-atomic object is a data race and therefore undefined behavior, not merely an occasionally wrong count.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when multiple threads share a small independent value such as a counter or flag.
- Avoid it when several fields form one invariant that is clearer under a mutex.

## 8. Simple Example

Two threads increment one atomic counter and joining them creates a clear completion point before printing. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `std::atomic` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `std::atomic` in the minimal example?
2. Medium — Why is the final value deterministic after both `join` calls even though the increment order is not?
3. Hard — Would replacing the atomic with `volatile int` remove the data race? Explain using visibility and atomicity rather than timing.

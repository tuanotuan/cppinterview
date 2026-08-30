# Day 43 — Designing a Concurrent Data Pipeline

## 1. Problem It Solves

A data pipeline divides work into stages with explicit inputs, outputs, ownership transfer, and synchronization boundaries. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Threads, futures, ownership, synchronization, and stages.
- You should be able to compile a short program and read its output.

## 3. Core Idea

Think of connected workstations: each stage receives one package, transforms it, and hands a complete package to the next station. Read `std::async` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
auto next = std::async(std::launch::async, [input = std::move(previous)] { return transform(input.get()); });
```

## 5. How It Works

1. The program introduces the smallest relevant form of `std::async`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- Sharing mutable containers across stages invites races; unbounded queues create memory pressure, and waiting in the wrong dependency order can deadlock.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when work naturally decomposes into ordered stages with clear value ownership.
- Avoid it when the data set is tiny or stage overhead exceeds any concurrency benefit.

## 8. Simple Example

Three `std::async` stages produce numbers, double them, and reduce them to a deterministic sum through moved futures. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `std::async` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `std::async` in the minimal example?
2. Medium — Which future owns each intermediate result before the next stage calls `get`?
3. Hard — Why does value transfer through futures avoid a data race even if the runtime schedules stages on different threads?

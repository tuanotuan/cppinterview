# Day 48 — Asynchronous Tasks with Coroutines

## 1. Problem It Solves

A coroutine task represents an operation that can pause and later deliver one result or exception to a continuation. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Awaiters, task results, handles, and scheduling boundaries.
- You should be able to compile a short program and read its output.

## 3. Core Idea

The task is a receipt for unfinished work. `co_await` registers where to continue, while a scheduler or event source eventually resumes the frame. Read `co_await` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
int value = co_await operation;
co_return value;
```

## 5. How It Works

1. The program introduces the smallest relevant form of `co_await`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- A coroutine is not automatically parallel or asynchronous; without a real scheduler, an awaiter may only simulate a suspension point.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when sequential-looking code must coordinate genuine asynchronous completion.
- Avoid it when the work is immediate, CPU-bound without a scheduler, or a plain future is enough.

## 8. Simple Example

A small task suspends once, is resumed explicitly by `main`, then returns a fixed integer through its promise. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `co_await` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `co_await` in the minimal example?
2. Medium — Why is the result unavailable before the caller resumes the suspended task?
3. Hard — Which missing component prevents this educational example from performing real background I/O?

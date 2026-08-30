# Day 44 — Coroutine Model: co_await, co_yield, and co_return

## 1. Problem It Solves

A coroutine can suspend while preserving local state, then resume later; the three keywords express waiting, yielding, and completion. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Functions, state machines, RAII, and basic templates.
- You should be able to compile a short program and read its output.

## 3. Core Idea

The compiler rewrites the function into a resumable state machine stored in a coroutine frame. Each suspension is a bookmark. Read `co_yield` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
co_await awaitable;
co_yield value;
co_return;
```

## 5. How It Works

1. The program introduces the smallest relevant form of `co_yield`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- Keywords alone do not provide scheduling, threads, or ownership; the return type and promise determine frame behavior and cleanup.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when a computation naturally pauses and resumes, produces a sequence, or awaits external completion.
- Avoid it when a normal function or loop expresses the control flow more simply.

## 8. Simple Example

A minimal generator uses `co_await suspend_never`, yields two values, and reaches `co_return`; its wrapper destroys the frame. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `co_yield` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `co_yield` in the minimal example?
2. Medium — At which statement does the caller regain control after requesting the first generated value?
3. Hard — Why can two coroutine return types interpret the same `co_return` syntax differently?

# Day 46 — Awaitables, Awaiters, and Suspension Lifecycle

## 1. Problem It Solves

An awaiter defines whether a coroutine suspends, what happens at suspension, and what value or effect appears when execution resumes. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Promise types, handles, and coroutine suspension.
- You should be able to compile a short program and read its output.

## 3. Core Idea

The three hooks form a checkpoint: `await_ready` may skip it, `await_suspend` parks or transfers control, and `await_resume` supplies the continuation result. Read `await_suspend` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
bool await_ready() const noexcept;
void await_suspend(std::coroutine_handle<>);
int await_resume() const;
```

## 5. How It Works

1. The program introduces the smallest relevant form of `await_suspend`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- Saving a handle for later requires a valid scheduler and lifetime plan; resuming inline from `await_suspend` can create subtle reentrancy.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when an external event, timer, or scheduler must integrate with coroutine suspension.
- Avoid it when the operation is immediately available and ordinary function calls are clearer.

## 8. Simple Example

A tracing awaiter returns ready immediately so the output shows `await_ready` followed directly by `await_resume` without suspension. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `await_suspend` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `await_suspend` in the minimal example?
2. Medium — Why is `await_suspend` not called when `await_ready` returns true?
3. Hard — If `await_suspend` stores the handle, which component becomes responsible for resuming it exactly while the frame is alive?

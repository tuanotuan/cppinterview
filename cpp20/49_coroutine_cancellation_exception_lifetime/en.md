# Day 49 — Coroutine Cancellation, Exceptions, Lifetime, and Allocation

## 1. Problem It Solves

Production coroutine types must coordinate cooperative cancellation, store exceptions, own frame lifetime, and understand where frame allocation occurs. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Task promises, stop tokens, RAII, exceptions, and frame ownership.
- You should be able to compile a short program and read its output.

## 3. Core Idea

The frame is a managed job record: a stop token marks cancellation, the promise stores failure, and an owning wrapper destroys the allocated record once. Read `unhandled_exception` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
void unhandled_exception() { error = std::current_exception(); }
```

## 5. How It Works

1. The program introduces the smallest relevant form of `unhandled_exception`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- Destroying a running frame, swallowing stored exceptions, capturing dead references, or assuming cancellation frees the frame immediately can all break correctness.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when you are implementing or auditing the ownership protocol of a coroutine abstraction.
- Avoid it when a tested library task already provides the required semantics.

## 8. Simple Example

The task counts promise allocation, stores an exception with `unhandled_exception`, observes a requested stop, and destroys its frame by RAII. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `unhandled_exception` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `unhandled_exception` in the minimal example?
2. Medium — Where is the thrown exception stored before the caller rethrows it?
3. Hard — Why does requesting cancellation not remove the need for exactly one later `destroy()` of the coroutine frame?

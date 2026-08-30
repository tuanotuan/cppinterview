# Day 45 — Promise Type, Coroutine Handle, and Coroutine Frame

## 1. Problem It Solves

The promise customizes coroutine behavior, the handle controls a suspended frame, and the frame stores state needed across suspensions. It makes an important assumption visible and checkable.

## 2. Prerequisites

- The coroutine state-machine model from Day 44.
- You should be able to compile a short program and read its output.

## 3. Core Idea

Promise is the control panel inside the frame; the handle is a small remote control that can resume, inspect, or destroy that frame. Read `std::coroutine_handle` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
using Handle = std::coroutine_handle<promise_type>;
```

## 5. How It Works

1. The program introduces the smallest relevant form of `std::coroutine_handle`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- A raw handle does not automatically own cleanup, so double destruction, leaks, or resuming a completed/dangling frame causes undefined behavior.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when building a coroutine abstraction whose lifecycle and result protocol must be explicit.
- Avoid it when an existing task or generator abstraction already provides safe ownership.

## 8. Simple Example

A small move-only task obtains a typed handle from its promise, resumes once, reads a result, and destroys the frame in its destructor. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `std::coroutine_handle` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `std::coroutine_handle` in the minimal example?
2. Medium — Which promise member creates the return object containing the handle?
3. Hard — Why must the wrapper disable copying when its destructor calls `handle.destroy()`?

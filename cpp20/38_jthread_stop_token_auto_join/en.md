# Day 38 — jthread, stop_token, and Automatic Joining

## 1. Problem It Solves

`std::jthread` owns a thread with RAII joining and can pass a cooperative stop token to the worker. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Threads, atomics, RAII, and joining.
- You should be able to compile a short program and read its output.

## 3. Core Idea

It is a scoped worker: leaving the scope requests orderly ownership cleanup and joins, while the token is a polite stop sign the worker chooses to observe. Read `std::jthread` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
std::jthread worker([](std::stop_token token) { /* cooperative work */ });
```

## 5. How It Works

1. The program introduces the smallest relevant form of `std::jthread`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- Automatic joining can still block forever if the worker never finishes; stop requests do not forcibly terminate code.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when a thread should be bound to scope and can cooperate with cancellation.
- Avoid it when detached lifetime is intentionally managed by a larger external system.

## 8. Simple Example

A scoped jthread writes an atomic result; after scope exit the automatic join makes the printed value safe and deterministic. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `std::jthread` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `std::jthread` in the minimal example?
2. Medium — Why is it safe to read the atomic result after the block ends without an explicit `join` call?
3. Hard — What failure remains possible if the callable ignores its stop token and waits forever?

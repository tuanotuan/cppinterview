# Day 39 — Cooperative Cancellation and stop_callback

## 1. Problem It Solves

The stop-state types let one component request cancellation, observers query it, and callbacks react promptly without polling. It makes an important assumption visible and checkable.

## 2. Prerequisites

- stop_source, stop_token, and callback lifetime.
- You should be able to compile a short program and read its output.

## 3. Core Idea

A stop source controls one shared alarm, tokens listen to its state, and callbacks are bells wired to ring when the alarm is triggered. Read `std::stop_callback` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
std::stop_callback callback{token, [] { /* wake or mark */ }};
```

## 5. How It Works

1. The program introduces the smallest relevant form of `std::stop_callback`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- Cancellation remains cooperative; callback code must be fast, thread-safe, and prepared to run during registration if stop was already requested.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when several operations share a cancellation signal or blocked work needs a wake-up hook.
- Avoid it when cleanup cannot safely occur in callback context or hard termination is being assumed.

## 8. Simple Example

A stop source owns the state, one callback flips an atomic flag, and requesting stop produces a deterministic result. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `std::stop_callback` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `std::stop_callback` in the minimal example?
2. Medium — What value does `request_stop()` return on the first successful request, and what does the token report afterward?
3. Hard — Why must callback lifetime and captured references remain valid even when registration happens after a stop request?

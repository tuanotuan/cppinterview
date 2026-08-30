# Day 47 — Generators and Lazy Data Streams

## 1. Problem It Solves

A generator exposes a sequence one element at a time without allocating and filling an entire result container first. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Coroutine frames, handles, and yield suspension.
- You should be able to compile a short program and read its output.

## 3. Core Idea

It is a paused producer. Every request resumes the producer until the next `co_yield`, then the saved frame waits with its local state intact. Read `co_yield` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
for (int value = first; value <= last; ++value) co_yield value;
```

## 5. How It Works

1. The program introduces the smallest relevant form of `co_yield`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- References to yielded internal values are valid only under the generator’s protocol, and abandoning a generator still requires destroying its frame.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when values are computed on demand, may be numerous, or may stop early.
- Avoid it when all values are small, already available, and ownership in a container is simpler.

## 8. Simple Example

The generator counts produced values and proves that none are produced until the caller requests them. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `co_yield` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `co_yield` in the minimal example?
2. Medium — What is the production counter before the first resume and after requesting two values?
3. Hard — Why can retaining a reference to `promise.current` across the next resume observe a changed value?

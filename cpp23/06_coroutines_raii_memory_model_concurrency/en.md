# Day 6 — Coroutines, RAII, Memory Model, and Concurrency

## 1. Problem It Solves

Concurrent and suspended work introduces state that outlives one ordinary call. RAII controls cleanup, while the memory model defines which cross-thread reads and writes are valid and observable. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Day 3: lifetime and move semantics.
- Day 5: lazy sequences and iteration.

## 3. Core Idea

A coroutine stores a paused call in a frame; RAII owns that frame or a thread; the memory model is the traffic law governing shared data. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
std::jthread worker([&] { counter.fetch_add(1); });
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for Coroutines, RAII, Memory Model, and Concurrency.
1. It starts two RAII-managed threads that update an atomic counter. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks a deterministic final count after both thread objects leave scope and join, making the important behavior easy to verify.

## 6. Common Mistakes

- Using an ordinary `int` for unsynchronized writes creates a data race and undefined behavior; forgetting frame ownership can leak or destroy suspended state too early.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves structured asynchronous work with explicit ownership and a justified synchronization rule.
- Avoid it when the task involves threads or coroutines merely to make sequential work look advanced.

## 8. Simple Example

A background counter uses `std::jthread` for automatic joining and `std::atomic` for race-free updates. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — Why does RAII joining prevent a lifetime bug but not by itself make two writes to a shared non-atomic `int` safe?

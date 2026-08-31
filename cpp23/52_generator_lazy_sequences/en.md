# Day 52 — `std::generator` and Lazy Coroutine Sequences

## 1. Problem It Solves

Writing a coroutine generator previously required a custom promise, iterator, and lifetime wrapper. C++23 `std::generator` standardizes a synchronous lazy range whose coroutine yields elements one at a time. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Day 5: lazy ranges.
- Day 6: coroutine frames and lifetime.

## 3. Core Idea

The coroutine is a paused producer. Each iterator increment resumes it until the next `co_yield`; the frame stores local state between pulls and is destroyed with the generator. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
std::generator<int> count() { co_yield 1; }
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for `std::generator` and Lazy Coroutine Sequences.
1. It yields a short integer sequence and consumes it with a range-based loop when the header exists. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks the numbers in order without an intermediate vector, making the important behavior easy to verify.

## 6. Common Mistakes

- Returning references to objects that expire between resumptions can dangle; assuming a generator is asynchronous or thread-safe misunderstands its synchronous pull model.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves large or unbounded sequences consumed incrementally through a standard range interface.
- Avoid it when the task involves small fixed data where a container or `views::iota` is simpler and has no coroutine frame.

## 8. Simple Example

A parser yields decoded records one by one so the caller can stop early without building a full collection. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — When does code before the first `co_yield` execute, and what lifetime owns local coroutine variables between two iterator increments?

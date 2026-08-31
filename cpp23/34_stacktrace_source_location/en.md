# Day 34 — `std::stacktrace` and `std::source_location`

## 1. Problem It Solves

Diagnostics need both the immediate call site and the chain of calls that led there. `std::source_location` captures source metadata cheaply; C++23 `std::stacktrace` captures runtime frames when implemented. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Day 1: compiler and library availability.
- Day 6: runtime call stacks and concurrency context.

## 3. Core Idea

A source location is one pin on the map. A stacktrace is the route taken to reach that pin; symbols and optimization determine how detailed that route appears. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
void log(std::source_location where = std::source_location::current());
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for `std::stacktrace` and `std::source_location`.
1. It captures the caller's function name and reports whether stacktrace support is available. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks a recognizable source function and a truthful support status, making the important behavior easy to verify.

## 6. Common Mistakes

- Calling `source_location::current()` inside the body captures the body line rather than a default-argument call site; stack traces may be incomplete in optimized stripped binaries.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves logging, assertions, error reports, and post-failure diagnostics where context pays for itself.
- Avoid it when the task involves hot paths that would capture a full stack on every successful operation.

## 8. Simple Example

A validation logger records the caller's function and captures a stack only when an invariant fails. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — Why does placing `source_location::current()` in a default parameter capture the caller, while evaluating it inside the function captures a different line?

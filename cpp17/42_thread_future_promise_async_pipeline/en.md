# Day 42 — Threads, Futures, Promises, and an Asynchronous Pipeline

## 1. Problem It Solves

Asynchronous stages need to transfer either a value or an exception without sharing mutable result storage manually. Futures represent eventual results, and promises provide a producer endpoint.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know thread lifetime, joining, move-only handles, exceptions, and blocking waits.

## 3. Core Idea

A promise and its future share a state. The producer fulfills that state once; the future consumes its value or exception. `std::async(std::launch::async, ...)` starts another asynchronous stage and returns its own future.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
std::promise<int> promise;
auto future = promise.get_future();
auto next = std::async(std::launch::async,
    [f = std::move(future)]() mutable { return f.get() * 7; });
```

## 5. How It Works

1. A producer thread places six into a promise while an async stage waits on the moved future.
2. State readiness synchronizes producer completion with the waiting stage, which transforms the value and fulfills a second future.
3. The program prints `pipeline result: 42`, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- Destroying a joinable thread terminates the program, a promise abandoned without a value yields a broken-promise error, and deferred async policy can surprise scheduling.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when one-shot asynchronous stages naturally transfer results and errors by value.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

The future itself is move-only, making single-consumer ownership visible. Explicit async launch avoids an implementation-chosen deferred stage.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- Model asynchronous dataflow with owned result channels, explicit launch policy, and deterministic joining or waiting.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does Threads, Futures, Promises, and an Asynchronous Pipeline address?
2. Medium — Which stage blocks until the promise is fulfilled?
3. Hard — How is an exception thrown by the async callable delivered to the caller?

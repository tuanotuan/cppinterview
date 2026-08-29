# Day 41 — std::thread, std::async, future, and promise

## 1. Problem It Solves

Starting work and transporting its eventual result are separate concerns. `std::thread` runs an explicit callable, `std::async` couples task launch to a future, and a `promise`/`future` pair creates a one-result communication channel.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 7 and 21-23: threads, synchronization, RAII, exceptions, return values, and ownership.

## 3. Core Idea

A future is the receiving end of shared asynchronous state. A promise writes that state manually; `async` owns the producer mechanics and returns the receiving future directly.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
std::promise<int> promise;
auto result = promise.get_future();
std::thread producer([&] { promise.set_value(21); });
auto task = std::async(std::launch::async, [] { return 42; });
```

## 5. How It Works

1. The promise exposes its future before a producer thread is started.
2. One thread stores 21 in the promise state, while `std::async` runs a separate function that returns 42.
3. Calling `get` waits if necessary, transfers each result or exception once, and prints deterministic values.

## 6. Common Mistakes

- Destroying a joinable `std::thread` calls `std::terminate`; calling `get` twice on the same future is also invalid.
- Do not copy the pattern without checking launch policy, thread join, promise fulfillment, broken promises, exception transport, and one-time future consumption. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when work can overlap and the caller needs a typed eventual result or exception.
- Avoid it when the task is tiny, strictly ordered, or a direct function call is clearer and cheaper.

## 8. Simple Example

A manual producer sends 21 through a promise, while an async task computes 42. Main receives both through futures and joins the explicit thread.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- Threads execute callables; futures transport completion, values, and exceptions.
- A future is the receiving end of shared asynchronous state. A promise writes that state manually; `async` owns the producer mechanics and returns the receiving future directly.
- The compiler or library follows a precise rule; verify launch policy, thread join, promise fulfillment, broken promises, exception transport, and one-time future consumption.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of std::thread, std::async, future, and promise?
2. Medium — What makes `future.get()` wait until its producer has supplied a value?
3. Hard — How does an exception thrown inside an `std::async` task reach the thread that calls `get`?

# Day 11 — Move-Only Lambda Capture and Capture Lifetime

## 1. Problem It Solves

Some useful state, such as `std::unique_ptr`, cannot be copied into a C++11 closure. C++14 init-capture can move that state into the closure, making the closure its new owner and naturally tying resource lifetime to closure lifetime.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 3, 4, and 10: unique ownership, move semantics, lambda capture, and init-capture.

## 3. Core Idea

The closure is an ordinary object with a move-only data member. It may itself be moved but not copied, and the captured resource remains alive until that closure member is destroyed.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
auto job = [ptr = std::move(owner)] {
    return *ptr;
};
```

## 5. How It Works

1. The init-capture casts the original smart pointer to an rvalue and initializes a closure member.
2. Ownership moves once during closure construction, so the source becomes empty and the closure becomes move-only.
3. Calling the closure safely accesses the resource even after the original smart pointer no longer owns anything.

## 6. Common Mistakes

- Trying to copy the resulting lambda fails because its generated closure type contains a non-copyable member.
- Do not copy the pattern without checking the ownership transfer, whether callers move or copy the closure, and how long the closure object lives. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when asynchronous or deferred work needs exclusive ownership of a resource beyond the creator's local scope.
- Avoid it when several independent callable copies must share the same state; then the ownership model needs redesign.

## 8. Simple Example

A string is allocated under a unique pointer and moved into a job closure. The source reports empty, while the job still prints the captured text because it owns the allocation.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- A move-only capture transfers ownership into closure state and makes copying the closure unavailable.
- The closure is an ordinary object with a move-only data member. It may itself be moved but not copied, and the captured resource remains alive until that closure member is destroyed.
- The compiler or library follows a precise rule; verify the ownership transfer, whether callers move or copy the closure, and how long the closure object lives.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of Move-Only Lambda Capture and Capture Lifetime?
2. Medium — What does `static_cast<bool>(owner)` report after `owner` is moved into the capture?
3. Hard — Why may moving the closure to another owner be valid even though copying that same closure is ill-formed?

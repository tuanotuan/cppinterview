# Day 18 — std::make_unique and Ownership Factories

## 1. Problem It Solves

C++11 required spelling `new` inside many `std::unique_ptr` constructions. C++14 `std::make_unique` combines allocation and ownership construction in one clear factory call and avoids exposing a raw owning pointer.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 3 and 11: `std::unique_ptr`, exclusive ownership, move semantics, and RAII.

## 3. Core Idea

The factory creates exactly one object and immediately places it under a unique owner. When that owner leaves scope or is reassigned, destruction follows automatically.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
auto item = std::make_unique<Item>(42);
```

## 5. How It Works

1. Template argument `Item` chooses the allocated type and function arguments are forwarded to its constructor.
2. The allocation result is wrapped directly in `std::unique_ptr<Item>` with exclusive ownership.
3. Member access works through the smart pointer and no explicit `delete` appears in user code.

## 6. Common Mistakes

- Creating several independent unique pointers from the same raw address causes multiple deletion and undefined behavior.
- Do not copy the pattern without checking the single owner, constructor arguments, transfer points, object lifetime, and custom deletion needs. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when a dynamically allocated object has one clear owner and its lifetime follows a scope or returned smart pointer.
- Avoid it when automatic storage or a direct value member is simpler, or the object genuinely needs shared ownership.

## 8. Simple Example

A small `Item` is created from an integer constructor argument. The unique pointer owns it, prints its value, and releases it automatically at the end of `main`.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- `std::make_unique` is the default C++14 factory for clear exclusive dynamic ownership.
- The factory creates exactly one object and immediately places it under a unique owner. When that owner leaves scope or is reassigned, destruction follows automatically.
- The compiler or library follows a precise rule; verify the single owner, constructor arguments, transfer points, object lifetime, and custom deletion needs.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of std::make_unique and Ownership Factories?
2. Medium — Who destroys the allocated `Item` when the smart pointer reaches the end of `main`?
3. Hard — Why is returning a `std::unique_ptr` factory result safer than returning a raw owning pointer whose deletion contract is only documented in prose?

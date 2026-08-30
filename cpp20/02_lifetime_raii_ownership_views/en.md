# Day 2 — Lifetime, RAII, Ownership, and Non-Owning Views

## 1. Problem It Solves

These ideas answer who owns a resource, how long it remains valid, and how other code may observe it without taking ownership. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Variables, scope, references, and containers.
- You should be able to compile a short program and read its output.

## 3. Core Idea

The owner is the house; a view is only an address. RAII ties cleanup to the owner leaving scope, but the address becomes useless after the house is gone. Read `std::span` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
std::vector<int> owner{1, 2, 3};
std::span<int> view{owner};
```

## 5. How It Works

1. The program introduces the smallest relevant form of `std::span`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- Returning or storing a view after its owner dies creates a dangling view and reading it has undefined behavior.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when one object owns data and short-lived code only needs to inspect or modify that existing data.
- Avoid it when the receiver must keep the data alive independently.

## 8. Simple Example

A `std::vector` owns three integers and a `std::span` temporarily views the same elements. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `std::span` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `std::span` in the minimal example?
2. Medium — After the span changes its first element, what value is printed from the vector and why?
3. Hard — Why would a span returned from a function that created a local vector be invalid even though the span object itself was copied successfully?

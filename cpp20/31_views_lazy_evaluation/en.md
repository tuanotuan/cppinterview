# Day 31 — Views and Lazy Evaluation

## 1. Problem It Solves

A view describes a transformation without eagerly creating a new owning container for all results. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Ranges, lambdas, and iterator-based traversal.
- You should be able to compile a short program and read its output.

## 3. Core Idea

A view is a recipe, not the finished meal. Each requested element pulls just enough work through the recipe. Read `std::views` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
auto doubled = values | std::views::transform([](int x) { return x * 2; });
```

## 5. How It Works

1. The program introduces the smallest relevant form of `std::views`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- A view may borrow its source and store callable state, so source lifetime and captured references remain part of correctness.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when data can be filtered or transformed on demand and avoiding intermediate containers helps clarity or cost.
- Avoid it when results must be owned, indexed repeatedly, or kept after the source dies.

## 8. Simple Example

A transform view increments a counter only when iteration requests values, demonstrating laziness directly. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `std::views` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `std::views` in the minimal example?
2. Medium — Why is the transformation counter still zero immediately after the view is constructed?
3. Hard — If the transforming lambda captures a local variable by reference, what must outlive every iteration over the view?

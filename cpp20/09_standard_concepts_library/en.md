# Day 9 — The Standard Concepts Library

## 1. Problem It Solves

The standard library supplies common vocabulary concepts so generic interfaces can express familiar type relationships consistently. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Custom concepts and constrained templates.
- You should be able to compile a short program and read its output.

## 3. Core Idea

Use standard concepts like shared labels on library doors. Readers and compilers already agree what `integral`, `same_as`, or `invocable` means. Read `std::integral` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
void show(std::integral auto value);
```

## 5. How It Works

1. The program introduces the smallest relevant form of `std::integral`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- Choosing a concept only because it makes one example compile may exclude valid types; match the weakest contract the algorithm truly needs.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when a standard concept accurately describes the public requirement.
- Avoid it when your domain has a stronger semantic rule that needs a custom name.

## 8. Simple Example

Two overloads use `std::integral` and `std::floating_point` to classify fixed inputs. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `std::integral` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `std::integral` in the minimal example?
2. Medium — Which overload accepts `42u`, and why does overload resolution not need a runtime test?
3. Hard — Why is `std::convertible_to<T, int>` not interchangeable with `std::same_as<T, int>` for an API contract?

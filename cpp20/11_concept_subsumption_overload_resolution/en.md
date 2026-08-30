# Day 11 — Concept Subsumption and Overload Resolution

## 1. Problem It Solves

When several constrained overloads are viable, subsumption helps the compiler choose the one whose constraint is more specific. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Custom concepts, standard concepts, and overloads.
- You should be able to compile a short program and read its output.

## 3. Core Idea

Think of nested gates: every signed integral is integral, so the signed gate is narrower. A value passing both should enter the narrower overload. Read `subsumption` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
template<class T> concept SignedInt = std::integral<T> && std::signed_integral<T>;
```

## 5. How It Works

1. The program introduces the smallest relevant form of `subsumption`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- Repeating logically equivalent Boolean expressions instead of building one concept from another may prevent the compiler from recognizing the intended ordering.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when overloads form a genuine general-to-special hierarchy.
- Avoid it when a single function with straightforward behavior is clearer than a constraint hierarchy.

## 8. Simple Example

One overload accepts all integral types and another accepts the named, more specific signed-integral concept. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `subsumption` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `subsumption` in the minimal example?
2. Medium — Which overload is called for `int`, and which one is called for `unsigned int`?
3. Hard — Why can two constraints that humans see as logically equivalent remain unordered if they were written as separate atomic constraints?

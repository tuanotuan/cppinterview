# Day 16 — constinit and Static Initialization

## 1. Problem It Solves

`constinit` verifies that a static or thread-storage object receives static initialization, avoiding uncertain dynamic initialization order. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Storage duration, global variables, and constant initialization.
- You should be able to compile a short program and read its output.

## 3. Core Idea

It is a timing guarantee, not a read-only label: initialization must be early, but the object may remain mutable afterward. Read `constinit` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
constinit int counter = 7;
```

## 5. How It Works

1. The program introduces the smallest relevant form of `constinit`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- Confusing `constinit` with `const` can lead to unexpected mutation; using a non-constant initializer causes a compilation error.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when mutable static-storage state must be initialized without dynamic startup ordering.
- Avoid it when a local automatic variable or a truly immutable `constexpr` object is more appropriate.

## 8. Simple Example

A `constinit` global counter starts from a constant value, is modified in `main`, and prints the new value. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `constinit` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `constinit` in the minimal example?
2. Medium — Why is incrementing the variable legal even though its declaration contains `constinit`?
3. Hard — How does `constinit` address the static initialization order problem without making later reads and writes thread-safe?

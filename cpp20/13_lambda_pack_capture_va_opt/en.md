# Day 13 — Lambda Pack Capture and __VA_OPT__

## 1. Problem It Solves

C++20 can capture every element of a parameter pack in a lambda and can emit macro tokens only when variadic macro arguments exist. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Variadic templates, lambda captures, and macros.
- You should be able to compile a short program and read its output.

## 3. Core Idea

Pack capture freezes many values inside one closure; `__VA_OPT__` is a conditional envelope that opens only for a nonempty macro pack. Read `__VA_OPT__` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
#define LOG(format, ...) std::printf(format __VA_OPT__(,) __VA_ARGS__)
```

## 5. How It Works

1. The program introduces the smallest relevant form of `__VA_OPT__`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- Capturing references into a delayed lambda can dangle, and traditional comma tricks for empty variadic macros are not portable replacements for `__VA_OPT__`.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when a generated closure must retain a variable number of values or a logging macro needs an optional comma.
- Avoid it when a normal function or container communicates the data flow more directly.

## 8. Simple Example

The example builds a printer that owns a captured pack and calls a logging macro once with and once without extra arguments. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `__VA_OPT__` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `__VA_OPT__` in the minimal example?
2. Medium — What tokens does `__VA_OPT__(,)` contribute when the variadic argument list is empty?
3. Hard — How would changing the init-capture from values to references affect the closure lifetime requirements?

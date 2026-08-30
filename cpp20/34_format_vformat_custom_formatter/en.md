# Day 34 — format, vformat, and Custom Formatters

## 1. Problem It Solves

The formatting library separates message templates from values, supports runtime format argument stores, and allows user types to define formatting rules. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Strings, variadic arguments, and stream output.
- You should be able to compile a short program and read its output.

## 3. Core Idea

A format string is a mold, arguments fill its fields, `vformat` accepts a type-erased argument pack, and a formatter teaches the mold about a custom type. Read `std::format` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
std::string text = std::format("value = {}", value);
```

## 5. How It Works

1. The program introduces the smallest relevant form of `std::format`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- Format strings and arguments must agree; custom formatter parsing must honor the required protocol. Library implementation support can lag the C++20 language standard.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when readable structured text must be assembled without long stream chains.
- Avoid it when the deployed standard library lacks `<format>` or simple stream output is sufficient.

## 8. Simple Example

The guarded source exercises `format`, `vformat`, and a formatter; this GCC 13.3/libstdc++ build selects and runs the full formatting path. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `std::format` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `std::format` in the minimal example?
2. Medium — What is the functional difference between passing arguments directly to `format` and through a format-argument store to `vformat`?
3. Hard — Why can a compiler support `-std=c++20` while its paired standard library still lacks a complete `<format>` implementation?

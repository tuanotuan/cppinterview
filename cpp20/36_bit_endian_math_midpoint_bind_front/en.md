# Day 36 — bit_cast, Endian, Bit Operations, Math Constants, midpoint, and bind_front

## 1. Problem It Solves

C++20 standardizes several low-level and numeric utilities that replace unsafe casts, hand-written bit tricks, magic constants, and repetitive wrappers. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Object representation, integers, functions, and numeric operations.
- You should be able to compile a short program and read its output.

## 3. Core Idea

Each utility names one narrow intent: copy representation, identify byte order, inspect bits, use a constant, find a safe middle, or pre-bind leading arguments. Read `std::bit_cast` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
auto bits = std::bit_cast<std::uint32_t>(value);
```

## 5. How It Works

1. The program introduces the smallest relevant form of `std::bit_cast`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- `bit_cast` requires equal size and trivially copyable types; endianness still matters when bytes cross a file or network boundary.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when the exact standardized operation matches a low-level or numeric task.
- Avoid it when a semantic value conversion is needed instead of representation copying.

## 8. Simple Example

The program inspects the bits of `1.0f`, reports native endian, counts bits, uses pi, computes a midpoint, and binds an addend. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `std::bit_cast` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `std::bit_cast` in the minimal example?
2. Medium — Why is `std::midpoint(a,b)` safer than `(a+b)/2` for large integers?
3. Hard — Why does a successful `bit_cast` not make the resulting integer a portable serialized representation across different endian machines?

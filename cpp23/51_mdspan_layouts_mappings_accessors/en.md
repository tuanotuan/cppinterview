# Day 51 — `mdspan` Layouts, Mappings, and Accessors

## 1. Problem It Solves

The same logical coordinates can map to memory in different orders, and element access may require a custom policy. `mdspan` separates extents, layout mapping, and accessor for zero-overhead customization. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Day 50: mdspan ownership and extents.
- Day 4: policy-based generic types.

## 3. Core Idea

Extents define the grid, a layout mapping converts coordinates to an offset, and an accessor turns a handle plus offset into the exposed reference or value. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
std::mdspan<T, Extents, std::layout_left, Accessor> view(data);
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for `mdspan` Layouts, Mappings, and Accessors.
1. It compares layout offsets and uses a tiny read accessor when mdspan is implemented. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks different offsets for the same coordinate and an accessor-adjusted value, making the important behavior easy to verify.

## 6. Common Mistakes

- Using a layout inconsistent with external storage silently reads the wrong elements; a custom accessor that returns a dangling proxy or violates its offset contract breaks the view.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves interop with row-major, column-major, strided, device, or specially accessed memory.
- Avoid it when the task involves inventing a custom policy when `layout_right` and `default_accessor` already match storage.

## 8. Simple Example

A column-major scientific array uses `layout_left`, while a checking accessor exposes values through a controlled read policy. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — For a `2 × 3` matrix, how do `layout_left` and `layout_right` map coordinate `(1, 0)`, and which storage order does each imply?

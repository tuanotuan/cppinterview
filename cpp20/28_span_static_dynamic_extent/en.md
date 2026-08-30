# Day 28 — span, Static Extent, and Dynamic Extent

## 1. Problem It Solves

`std::span` passes contiguous elements without copying or owning them, with size known either in the type or at runtime. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Contiguous arrays, containers, and non-owning lifetime rules.
- You should be able to compile a short program and read its output.

## 3. Core Idea

A span is a window over existing storage. Static extent engraves the window size into its type; dynamic extent carries the size beside the pointer. Read `std::span` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
std::span<int, 3> fixed{data};
std::span<int> dynamic{data};
```

## 5. How It Works

1. The program introduces the smallest relevant form of `std::span`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- The span never extends its source lifetime, and constructing a fixed-extent span from the wrong element count is invalid.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when a function needs a safe pointer-and-count view over an array, `std::array`, or vector.
- Avoid it when the callee must own, resize, or retain data beyond the source lifetime.

## 8. Simple Example

Fixed and dynamic spans view the same three-element array and expose their different `extent` constants. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `std::span` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `std::span` in the minimal example?
2. Medium — Which extent is encoded in the type and which size is stored at runtime?
3. Hard — Why can converting `std::span<int>` to `std::span<int, 3>` require a runtime precondition even though the target extent is compile-time?

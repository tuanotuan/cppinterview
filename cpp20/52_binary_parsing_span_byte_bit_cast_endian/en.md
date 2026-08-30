# Day 52 — Binary Parsing with span, byte, bit_cast, and Endian

## 1. Problem It Solves

Safe binary parsing must bound every read, represent raw bytes explicitly, copy object representation legally, and normalize external byte order. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Spans, byte representation, bit operations, and endian from Days 28 and 36.
- You should be able to compile a short program and read its output.

## 3. Core Idea

A span is the packet boundary, `std::byte` says “raw data,” `bit_cast` reconstructs a same-sized representation, and endian logic translates wire order. Read `std::span<const std::byte>` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
std::span<const std::byte> packet{raw};
auto value = std::bit_cast<std::uint32_t>(field);
```

## 5. How It Works

1. The program introduces the smallest relevant form of `std::span<const std::byte>`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- Reading past the span is invalid, casting an unaligned byte pointer to an integer pointer can violate alignment and aliasing, and native endian is not wire endian.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when a fixed binary field has a documented width and byte order.
- Avoid it when the format is textual, variable-length without validation, or requires richer schema handling.

## 8. Simple Example

Four fixed little-endian bytes are copied into an array, bit-cast to `uint32_t`, and normalized on big-endian hosts. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `std::span<const std::byte>` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `std::span<const std::byte>` in the minimal example?
2. Medium — What hexadecimal value is parsed from bytes `78 56 34 12` in little-endian order?
3. Hard — Why is copying into `std::array<std::byte,4>` and then bit-casting safer than dereferencing a `reinterpret_cast<uint32_t*>` into the packet?

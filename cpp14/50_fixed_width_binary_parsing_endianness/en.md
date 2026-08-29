# Day 50 — Fixed-Width Integers, Binary Parsing, and Endianness

## 1. Problem It Solves

Binary protocols define fields by exact bit width and byte order, while native C++ integer size and host byte order may vary. Fixed-width integer types and explicit shift/or parsing make the external representation independent of machine layout.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 8, 24, and 49: binary literals, object representation, shifts, unsigned arithmetic, layout, and portability.

## 3. Core Idea

Bytes on the wire are a format, not an in-memory object. Read each byte as unsigned, widen before shifting, combine according to the declared endian order, and never reinterpret arbitrary bytes as a struct.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
std::uint32_t value =
    (std::uint32_t(bytes[0]) << 24) |
    (std::uint32_t(bytes[1]) << 16) |
    (std::uint32_t(bytes[2]) << 8)  |
    std::uint32_t(bytes[3]);
```

## 5. How It Works

1. Four fixed-width bytes are interpreted as a big-endian 32-bit field.
2. Each byte is widened to unsigned 32-bit form before shifting, then bitwise OR assembles the value.
3. The parsed value prints as hexadecimal `12345678`, and a separate byte copy reports the host's native endian order.

## 6. Common Mistakes

- Shifting a signed narrow value before widening can overflow or sign-extend; copying a struct directly also imports padding and host endianness.
- Do not copy the pattern without checking field width, signedness, shift count, input length, declared byte order, overflow, bounds, and format validation. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when reading files, network packets, device registers, or any format with specified widths and byte order.
- Avoid it when native struct layout or pointer casting is being used as a shortcut for portable parsing.

## 8. Simple Example

The byte sequence 12 34 56 78 is assembled as a big-endian word. `std::memcpy` safely inspects one byte of a 16-bit marker to identify host order.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- Portable binary parsing follows the format's widths and order explicitly instead of trusting host representation.
- Bytes on the wire are a format, not an in-memory object. Read each byte as unsigned, widen before shifting, combine according to the declared endian order, and never reinterpret arbitrary bytes as a struct.
- The compiler or library follows a precise rule; verify field width, signedness, shift count, input length, declared byte order, overflow, bounds, and format validation.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of Fixed-Width Integers, Binary Parsing, and Endianness?
2. Medium — What hexadecimal value results from big-endian bytes `12 34 56 78`?
3. Hard — Why must each `std::uint8_t` byte be converted to `std::uint32_t` before a large left shift?

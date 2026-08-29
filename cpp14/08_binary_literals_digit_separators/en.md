# Day 8 — Binary Literals and Digit Separators

## 1. Problem It Solves

Bit masks are hard to review when written only in decimal or hexadecimal, and long numeric constants are easy to miscount. C++14 adds binary literals and apostrophe separators that improve source readability without changing the stored value.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Day 1 toolchain and the basic relationship between integer values and their written representation.

## 3. Core Idea

The prefix chooses a base and separators are visual whitespace inside the token. The compiler removes separators conceptually, parses the digits, then stores an ordinary integer.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
int mask = 0b1010'0101;
int population = 1'000'000;
```

## 5. How It Works

1. The `0b` prefix tells the compiler that each following digit is a binary bit.
2. Apostrophes may separate valid digit groups but contribute no numeric magnitude.
3. The binary mask prints as its decimal value and the grouped decimal literal prints as one million.

## 6. Common Mistakes

- Using a digit not valid for the chosen base, or placing a separator at an illegal position, causes a compile error.
- Do not copy the pattern without checking the base prefix, valid digits, intended bit positions, and separator placement. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when a constant represents flags, protocol bits, permissions, or a long human-readable quantity.
- Avoid it when the grouping suggests a meaning that does not match the actual bit fields or units.

## 8. Simple Example

A permission byte uses groups of four bits, while a user count uses groups of three decimal digits. Both literals remain normal integers after compilation.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- Literal formatting improves reviewability but never changes the numeric value or integer type by itself.
- The prefix chooses a base and separators are visual whitespace inside the token. The compiler removes separators conceptually, parses the digits, then stores an ordinary integer.
- The compiler or library follows a precise rule; verify the base prefix, valid digits, intended bit positions, and separator placement.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of Binary Literals and Digit Separators?
2. Medium — What decimal value is produced by `0b1111'0000`?
3. Hard — Why can two differently grouped literals such as `0b1010'0101` and `0b10'100'101` represent exactly the same value?

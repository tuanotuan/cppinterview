# Day 25 — using enum, char8_t, and Safe Integral Comparisons

## 1. Problem It Solves

These C++20 tools reduce enum verbosity, give UTF-8 code units a distinct type, and avoid surprising signed/unsigned comparison conversions. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Scoped enums, character types, and signed integers.
- You should be able to compile a short program and read its output.

## 3. Core Idea

`using enum` opens a scoped set of names locally, `char8_t` labels UTF-8 code units, and comparison helpers compare mathematical integer values safely. Read `std::cmp_less` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
using enum State;
bool smaller = std::cmp_less(-1, 1u);
```

## 5. How It Works

1. The program introduces the smallest relevant form of `std::cmp_less`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- Opening multiple enums can create name collisions; `char8_t` is not `char`; ordinary comparison between negative signed and unsigned values may surprise.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when local enum names stay unambiguous, UTF-8 code units need a precise type, or integer signedness differs.
- Avoid it when the scope would become ambiguous or byte-oriented APIs specifically require `char`.

## 8. Simple Example

The program imports two enum names, stores one UTF-8 code unit, and safely compares `-1` with `1u`. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `std::cmp_less` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `std::cmp_less` in the minimal example?
2. Medium — Why does `std::cmp_less(-1, 1u)` produce the mathematically expected result?
3. Hard — Why can passing a `char8_t*` directly to an API expecting `const char*` fail even though both point to one-byte code units on common systems?

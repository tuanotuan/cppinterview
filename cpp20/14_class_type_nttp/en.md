# Day 14 — Class Types as Non-Type Template Parameters

## 1. Problem It Solves

C++20 permits suitable structural class values as template arguments, enabling readable compile-time data such as fixed strings. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Class templates, constexpr, and non-type parameters.
- You should be able to compile a short program and read its output.

## 3. Core Idea

The value itself becomes part of the template identity. Two different fixed strings therefore name two different specializations. Read `template<FixedString Name>` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
template<FixedString Name>
void greet();
```

## 5. How It Works

1. The program introduces the smallest relevant form of `template<FixedString Name>`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- Only structural types qualify; private members, mutable members, or unsuitable subobjects make the class invalid as an NTTP type.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when small immutable compile-time values must participate in specialization or type identity.
- Avoid it when the value changes at runtime or does not need to create distinct specializations.

## 8. Simple Example

A structural `FixedString` carries a greeting name into a function specialization and prints it. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `template<FixedString Name>` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `template<FixedString Name>` in the minimal example?
2. Medium — Why do `greet<"Ada">` and `greet<"Lin">` denote different function specializations?
3. Hard — Which structural-type rule would be broken by making the character array private, and why does access control matter here?

# Day 13 — Class Template Argument Deduction

## 1. Problem It Solves

Constructing a class template often repeats type information already visible in constructor arguments. Class template argument deduction, or CTAD, lets the compiler infer template arguments at variable declarations.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know class templates, constructors, function template deduction, and initialization syntax.

## 3. Core Idea

When a template name appears without an argument list in a suitable declaration, constructors and deduction guides form candidates. The chosen candidate determines the specialization first; ordinary construction then initializes that concrete type.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
std::pair point{3, 4};
std::vector values{1, 2, 3};
```

## 5. How It Works

1. C++17 deduces a pair of integers and a vector of integers from braced constructor arguments.
2. Implicit deduction candidates generated from library constructors participate in overload resolution before each object is initialized.
3. The program prints `point: 3,4` and `sum: 6`, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- CTAD is not available in every type context and can deduce an unintended element type, especially with pointers, references, or initializer-list constructors.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when constructor arguments make the intended specialization unambiguous and removing repetition improves readability.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

Static assertions verify the exact standard-library specializations, then the program prints values derived from each object.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- CTAD deduces a class specialization at a declaration; it does not turn a class template into a runtime dynamically typed object.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does Class Template Argument Deduction address?
2. Medium — Which specializations are deduced for the pair and vector in the sample?
3. Hard — Why can an initializer-list constructor change CTAD results compared with parentheses?

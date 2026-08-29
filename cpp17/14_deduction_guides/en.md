# Day 14 — Deduction Guides

## 1. Problem It Solves

A constructor's parameter types do not always express the desired class-template arguments. A deduction guide supplies an explicit mapping from initialization arguments to a specialization.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Understand CTAD from Day 13, overload resolution, conversions, and class-template initialization.

## 3. Core Idea

A guide has function-like parameters and a trailing template-id, but it is not a callable function. It participates only in deduction, after which the resulting specialization must still be constructible from the original initializer.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
template<class T> struct Box { T value; };
template<class T> Box(T) -> Box<T>;
Box(const char*) -> Box<std::string>;
```

## 5. How It Works

1. A general guide preserves argument type, while a more specific guide maps a string literal's pointer type to owned `std::string`.
2. Overload resolution selects the specific guide, deduces `Box<std::string>`, then aggregate initialization performs the conversion.
3. The program prints `number: 42` and `text: C++17`, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- A guide can make deduction succeed while later initialization fails, or can unexpectedly alter ownership by deducing a pointer rather than an owning type.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when implicit constructor-based deduction is impossible or chooses a specialization that violates intended semantics.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

The string-literal guide intentionally creates an owning string box, while the generic guide produces an integer box.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- Deduction guides control type selection only; constructors and conversions still control object creation.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does Deduction Guides address?
2. Medium — Why is the text box not deduced as `Box<const char*>`?
3. Hard — How can overlapping user-defined and implicit guides create ambiguity?

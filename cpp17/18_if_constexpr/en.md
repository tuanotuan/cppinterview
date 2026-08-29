# Day 18 — if constexpr

## 1. Problem It Solves

A template may need different implementations for different type categories. A normal `if` still requires both branches to be well formed after instantiation, even when one can never execute.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know function templates, type traits, discarded statements, and compile-time conditions.

## 3. Core Idea

`if constexpr` evaluates a constant condition during instantiation and discards the non-selected branch. Dependent invalid code in that discarded branch need not be instantiated for the chosen type.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
if constexpr (std::is_integral_v<T>) {
    return value + 1;
} else {
    return value.size();
}
```

## 5. How It Works

1. A template classifies arithmetic and string values with type-specific expressions.
2. Only the selected branch contributes code for each specialization, so string-only operations are never formed for integers.
3. The program prints descriptions for an integer, a floating-point value, and a string, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- Non-dependent invalid syntax can still be diagnosed even in a discarded branch; `if constexpr` is not a general comment-out mechanism.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when one generic interface has genuinely different compile-time implementations by type capability or category.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

The classifier uses only valid operations for each supplied type and returns ordinary strings that make branch selection visible.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- `if constexpr` selects template code during instantiation; it does not add runtime polymorphism.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does if constexpr address?
2. Medium — Which branch is instantiated for `describe(3.5)`?
3. Hard — Why can some errors still appear in a branch that is discarded for every current call?

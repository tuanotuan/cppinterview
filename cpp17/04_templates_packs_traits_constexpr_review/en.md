# Day 4 — Reviewing Templates, Parameter Packs, Type Traits, and constexpr

## 1. Problem It Solves

Reusable code must accept families of types without losing validation or duplicating algorithms. Templates describe the family, packs represent variable arity, traits expose compile-time facts, and `constexpr` permits constant evaluation.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Understand overloads, recursion, compile-time constants, and the distinction between types and values.

## 3. Core Idea

A variadic template receives a parameter pack that can be expanded or processed recursively. Type traits validate supported arguments, and a valid `constexpr` call may initialize a constant or static assertion.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
template<class T>
constexpr T sum(T value) { return value; }
template<class T, class... Ts>
constexpr auto sum(T first, Ts... rest) {
    return first + sum(rest...);
}
```

## 5. How It Works

1. Recursive overloads consume one value at a time until the single-argument base case is reached.
2. A conjunction of traits validates all types, while the fixed integer call is evaluated during translation.
3. The program prints `compile-time sum: 10` and `mixed sum: 7.5`, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- Unconstrained templates often fail with long diagnostics deep inside an expression; validate the intended domain near the interface.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when one operation is meaningful for several related types or a variable number of arguments.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

A recursive sum reviews older machinery before Day 16 replaces recursion with a C++17 fold. Traits assert that every argument is arithmetic.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- Templates generate code, traits describe candidates, and constant evaluation moves suitable work from runtime to translation.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does Reviewing Templates, Parameter Packs, Type Traits, and constexpr address?
2. Medium — Why can the integer sum initialize a `constexpr` variable while a call using runtime input cannot?
3. Hard — What changes when recursive pack processing is replaced by a C++17 fold expression?

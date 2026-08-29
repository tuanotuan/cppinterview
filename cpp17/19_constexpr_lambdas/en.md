# Day 19 — constexpr Lambdas

## 1. Problem It Solves

Small local computations used in constant expressions previously needed separate named functions. C++17 lets suitable lambda call operators participate in constant evaluation.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know lambda syntax, captures, constant expressions, `constexpr` functions, and array extents.

## 3. Core Idea

A lambda whose body satisfies constant-expression rules can have a `constexpr` call operator, explicitly or implicitly. A call is constant-evaluated only when its arguments and captured state are also usable in that context.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
constexpr auto square = [](int x) constexpr {
    return x * x;
};
static_assert(square(4) == 16);
```

## 5. How It Works

1. A captureless square lambda is invoked in a static assertion and to determine an array extent.
2. The compiler evaluates both calls during translation; the same closure may still be called normally at runtime.
3. The program prints `array size: 9` and `runtime square: 25`, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- Marking a variable `constexpr` does not make operations with runtime arguments constant; constant evaluation depends on the complete call expression.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when a short policy or transformation should remain local but must also work in compile-time contexts.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

One closure is reused at compile time and runtime, proving that constexpr describes an evaluation capability rather than a separate execution engine.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- A constexpr lambda can be evaluated early when all inputs permit it, while retaining ordinary callable behavior.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does constexpr Lambdas address?
2. Medium — Which calls in the sample must be evaluated during translation?
3. Hard — How can a capture prevent a lambda call from being a constant expression?

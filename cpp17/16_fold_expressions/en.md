# Day 16 — Fold Expressions

## 1. Problem It Solves

Applying one operator to every element of a parameter pack previously required recursive overloads and a base case. Fold expressions express that reduction directly and usually produce shorter diagnostics.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Understand variadic templates, parameter-pack expansion, associativity, and identity values.

## 3. Core Idea

A unary or binary fold expands a pack around an operator. The placement of the ellipsis selects left or right association, while a supplied initial value gives an identity and allows an empty pack when the operator permits it.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
template<class... Ts>
auto sum(Ts... values) {
    return (0 + ... + values);
}
```

## 5. How It Works

1. A binary left fold starts from zero and adds each argument in source order.
2. A second comma fold invokes the output expression for every pack element without recursive function calls.
3. The program prints `sum: 10` followed by `values: 1 2 3 4`, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- Left and right folds can differ for non-associative operators; empty unary folds are defined only for a limited set of operators.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when one operator combines or sequences all elements of a variadic parameter pack.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

The sample uses an arithmetic fold with an identity and a comma fold for output, showing both value reduction and ordered side effects.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- Choose fold direction and identity from operator semantics, not merely from the shortest spelling.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does Fold Expressions address?
2. Medium — What does `sum()` return with the binary fold shown?
3. Hard — How would subtraction differ between left and right folds for the same pack?

# Day 17 — void_t, conjunction, disjunction, and Callable Type Traits

## 1. Problem It Solves

Generic code needs to ask whether types provide an expression, whether several constraints hold, and whether a callable accepts a given signature without causing a hard compilation error.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know SFINAE, partial specialization, `decltype`, `std::declval`, and Boolean type traits.

## 3. Core Idea

`std::void_t` maps well-formed dependent expressions to `void` for detection. `std::conjunction` and `std::disjunction` combine traits with short-circuit structure, while `std::is_invocable` checks call syntax.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
template<class T, class = void>
struct has_size : std::false_type {};
template<class T>
struct has_size<T, std::void_t<decltype(
    std::declval<const T&>().size())>> : std::true_type {};
```

## 5. How It Works

1. A detection trait checks for a const-qualified `size()` expression on several candidate types.
2. Logical traits combine the results, and an invocability trait verifies a lambda call and requested return conversion.
3. The program prints three Boolean lines for detection, conjunction, and invocability, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- Detection proves that an expression is syntactically well formed, not that it has the desired complexity, lifetime, exception, or semantic behavior.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when C++17 generic code needs graceful participation control before concepts are available.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

Vectors and strings satisfy the detector, integers do not, and a generic square lambda is invocable with an integer argument.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- Detection idioms describe syntactic capabilities; layer explicit semantic documentation above them.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does void_t, conjunction, disjunction, and Callable Type Traits address?
2. Medium — Why does checking `has_size<int>` yield false instead of a hard error?
3. Hard — How does short-circuit trait composition avoid instantiating an invalid later operand?

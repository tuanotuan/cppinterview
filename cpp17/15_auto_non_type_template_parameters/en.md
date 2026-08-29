# Day 15 — Non-Type Template Parameters with auto

## 1. Problem It Solves

Non-type template parameters previously required spelling a specific parameter type, even when the value itself made that type clear. C++17 permits `auto` so one template can accept several supported constant-value types.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know type template parameters, compile-time constants, `decltype`, and integral constant expressions.

## 3. Core Idea

In `template<auto Value>`, deduction determines both the value and its type at instantiation. The value remains a compile-time template argument and distinct values or types produce distinct specializations.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
template<auto Value>
struct Constant {
    static constexpr auto value = Value;
};
```

## 5. How It Works

1. The same class template is instantiated once with an integer and once with a character.
2. `decltype(Value)` is deduced separately in each specialization, and inline constexpr storage exposes the constant without runtime state.
3. The program prints `integer: 42` and `character: Z`, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- The argument must be a permitted compile-time non-type value; arbitrary runtime objects and many address-dependent values cannot be supplied.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when behavior or storage depends on a compile-time value whose exact supported type may vary.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

Static assertions verify that integer and character values preserve their types. Runtime printing only makes those compile-time selections visible.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- `auto` makes non-type templates more general, but it does not turn runtime values into template arguments.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does Non-Type Template Parameters with auto address?
2. Medium — What type is deduced for `Constant<'Z'>::value`?
3. Hard — Why are `Constant<1>` and `Constant<1L>` distinct specializations?

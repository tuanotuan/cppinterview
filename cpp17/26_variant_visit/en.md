# Day 26 — std::variant and std::visit

## 1. Problem It Solves

A value may validly be one of several known types, but unions require manual lifetime tracking and base-class polymorphism adds allocation or hierarchy constraints. `std::variant` provides a type-safe tagged union.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know templates, object lifetime, overloads, generic lambdas, and exhaustive state handling.

## 3. Core Idea

A variant owns exactly one active alternative and records its index. `std::visit` invokes a callable that must be valid for every possible active alternative in the visited variant set.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
std::variant<int, std::string> value = 42;
std::visit(overloaded{
    [](int n) { /*...*/ },
    [](const std::string& s) { /*...*/ }
}, value);
```

## 5. How It Works

1. An overloaded visitor combines two lambdas, one for integers and one for strings.
2. After assignment changes the active alternative, `std::visit` dispatches to the matching overload without a manual tag check.
3. The program prints `integer: 42` followed by `text: C++17`, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- Calling `std::get<T>` for an inactive alternative throws `std::bad_variant_access`; visitation is often safer for complete handling.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when the closed set of possible types is known and each state has meaningful type-specific behavior.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

The same variant is visited in two states, and overload resolution selects the appropriate lambda each time.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- Variant makes alternatives explicit in the type; visitors make state handling visible and compiler-checkable.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does std::variant and std::visit address?
2. Medium — Which overload runs after the string assignment?
3. Hard — What is `valueless_by_exception`, and which operations can produce it?

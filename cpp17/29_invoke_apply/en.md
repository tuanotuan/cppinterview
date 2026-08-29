# Day 29 — std::invoke and std::apply

## 1. Problem It Solves

Generic code must uniformly call functions, function objects, member functions, and member-data pointers. Tuple-held arguments also need expansion into a call without hand-written index plumbing.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know callables, member pointers, tuples, forwarding, and variadic invocation.

## 3. Core Idea

`std::invoke` implements the standard generalized call rules for ordinary and member callables. `std::apply` unpacks tuple-like elements and invokes a callable with them using those rules.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
std::invoke(&Widget::scale, widget, 3);
std::apply(add, std::tuple{2, 5});
```

## 5. How It Works

1. A member function pointer is invoked on an object, a member-data pointer is read, and an ordinary function receives tuple elements.
2. The library normalizes the different syntactic forms while preserving the callable's result and argument categories.
3. The program prints `scaled: 21`, `member: 7`, and `applied: 7`, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- Tuple elements are passed according to the tuple object's value category; accidental copies or moved-from elements can result if forwarding is misunderstood.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when generic infrastructure accepts several callable forms or arguments naturally arrive in a tuple.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

Three calls demonstrate member function, member data, and tuple expansion without custom dispatch code.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- Use the standard invocation model so wrappers agree with traits such as `std::is_invocable`.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does std::invoke and std::apply address?
2. Medium — Which object supplies `this` when the member function pointer is invoked?
3. Hard — How does tuple value category affect references forwarded by `std::apply`?

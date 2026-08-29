# Day 22 — Evaluation Order and noexcept in Function Types

## 1. Problem It Solves

Unclear operand evaluation can make side effects surprising, while exception specifications previously had limited participation in type relationships. C++17 strengthens several sequencing rules and makes `noexcept` part of a function type.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know side effects, sequencing, function pointers, exception specifications, and `std::is_nothrow_invocable`.

## 3. Core Idea

For assignment in C++17, the right operand is sequenced before the left operand. Separately, a pointer type may explicitly require a non-throwing function, allowing compile-time distinction between potentially throwing and `noexcept` targets.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
using Safe = void (*)() noexcept;
Safe action = &safe_action;
values[index()] = produce();
```

## 5. How It Works

1. Logging helpers expose the evaluation of an assignment's right side before the indexed left side.
2. A `noexcept` function pointer and type trait then verify the non-throwing callable contract.
3. The program prints `value` before `index`, then the stored number and safe action text, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- C++17 does not impose a simple left-to-right rule on all function arguments; avoid relying on order unless a specific sequencing rule guarantees it.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when reviewing expressions with side effects or encoding a non-throwing callback contract in a type.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

The assignment uses separate logging functions so order is visible. A static assertion confirms that the selected function pointer is nothrow-invocable.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- Reason from exact sequencing rules, and treat `noexcept` as part of callable type compatibility in C++17.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does Evaluation Order and noexcept in Function Types address?
2. Medium — Which logging word appears first in the assignment expression?
3. Hard — Which conversions are allowed between throwing and non-throwing function pointers?

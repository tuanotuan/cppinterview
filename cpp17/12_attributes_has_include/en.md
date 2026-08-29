# Day 12 — nodiscard, maybe_unused, fallthrough, and __has_include

## 1. Problem It Solves

APIs need portable ways to communicate ignored results, intentional non-use, deliberate switch fallthrough, and optional header availability to compilers and readers.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know compiler diagnostics, preprocessor conditions, return values, and switch control flow.

## 3. Core Idea

Standard attributes add semantic intent without changing successful execution. `[[nodiscard]]` requests a warning for discarded results, `[[maybe_unused]]` suppresses intentional unused warnings, `[[fallthrough]]` marks a deliberate case transition, and `__has_include` tests header availability.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
[[nodiscard]] int status();
[[maybe_unused]] const int debug_id = 7;
case 1: prepare(); [[fallthrough]];
#if __has_include(<optional>)
```

## 5. How It Works

1. The preprocessor detects `<optional>`, while declarations carry three standard attributes in valid contexts.
2. The nodiscard result is consumed, the unused debug value is explicitly intentional, and the switch fallthrough reaches shared handling without a warning.
3. The program prints `optional header: 1`, `status: 0`, and `level: 10`, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- Attributes are not runtime enforcement: a diagnostic may be ignored, and `__has_include` proves only header availability, not an API's feature completeness.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when intent can be checked by diagnostics or optional compilation paths must be selected portably.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

Every construct is exercised without intentionally producing warnings, so the file remains clean under the course warning flags.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- Attributes improve the compiler-reader contract, while feature-test macros and header checks should guard portability decisions.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does nodiscard, maybe_unused, fallthrough, and __has_include address?
2. Medium — What warning is requested if the return from the nodiscard function is discarded?
3. Hard — Why is a standard feature-test macro usually stronger evidence than `__has_include` alone?

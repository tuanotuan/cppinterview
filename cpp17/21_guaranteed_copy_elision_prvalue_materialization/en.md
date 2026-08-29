# Day 21 — Guaranteed Copy Elision and prvalue Materialization

## 1. Problem It Solves

Returning a fresh object by value once appeared to depend on an optional optimization and an accessible move constructor. C++17 redefines important prvalue cases so the destination object is initialized directly.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know constructors, copy and move operations, return-by-value, temporaries, and value categories.

## 3. Core Idea

A prvalue initially represents initialization rather than a separate temporary object. In guaranteed cases such as returning `Token{42}` as `Token`, the result object is constructed directly; materialization occurs only when an actual object is required.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
Token make_token() {
    return Token{42};
}
Token token = make_token();
```

## 5. How It Works

1. A factory returns a prvalue of exactly its declared class type.
2. C++17 initializes the function result and then the local destination without invoking deleted copy or move constructors.
3. The program prints `construct 42` once, followed by `value: 42`, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- Named return value optimization remains different: returning a named local may still require an accessible move or copy operation if optional NRVO is not performed.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when factories naturally create and return a fresh value of the declared result type.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

Both copy and move constructors are deleted, yet the program is well formed because no source object needs to be transferred in the guaranteed prvalue path.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- Return values naturally; do not add `std::move` to a fresh prvalue, and distinguish guaranteed elision from optional NRVO.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does Guaranteed Copy Elision and prvalue Materialization address?
2. Medium — How many constructor messages appear, and why are deleted moves irrelevant?
3. Hard — Why does returning a named local have different requirements from returning `Token{42}`?

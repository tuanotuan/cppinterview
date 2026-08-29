# Day 9 — if and switch with an Initializer

## 1. Problem It Solves

A lookup result or parsed state often needs a name only inside one branch decision. Declaring it earlier leaks that name into a wider scope and separates initialization from its test.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know block scope, iterators, associative-container lookup, and ordinary `if` and `switch`.

## 3. Core Idea

C++17 permits `if (init; condition)` and `switch (init; condition)`. The initialized name exists through the controlled branches, then is destroyed when the whole statement ends.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
if (auto it = scores.find("Ada"); it != scores.end()) {
    use(it->second);
}
```

## 5. How It Works

1. The lookup iterator is initialized directly in the `if` header and immediately compared with the map end.
2. The iterator is available in both branches but not after the statement, preventing accidental stale reuse.
3. The program prints `Ada: 91` followed by the classification `excellent`, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- The initializer and condition use a semicolon, not a comma; remember that the initialized name is shared by `else`.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when a helper object belongs exclusively to one conditional statement.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

A map iterator is scoped to its `if`, and a copied score is scoped to a `switch` that categorizes the result.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- Statement initializers keep acquisition, testing, and destruction together in the narrowest useful scope.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does if and switch with an Initializer address?
2. Medium — Where is the lookup iterator alive, and can it be named after the `if`?
3. Hard — How does destruction work when the initializer owns a lock shared by both branches?

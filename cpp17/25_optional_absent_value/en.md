# Day 25 — std::optional and Representing an Absent Value

## 1. Problem It Solves

Sentinel values such as minus one overload the value domain and can be forgotten by callers. `std::optional<T>` explicitly represents either a live `T` or no value.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know value semantics, object lifetime, Boolean tests, return-by-value, and exceptions from checked access.

## 3. Core Idea

An optional owns in-place storage for a `T` plus engagement state. It does not allocate merely by being optional; constructing, resetting, or assigning changes the lifetime of the contained object.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
std::optional<int> find_score(std::string_view name);
if (const auto score = find_score("Ada")) {
    use(*score);
}
```

## 5. How It Works

1. A lookup function returns an engaged optional for one fixed name and `std::nullopt` otherwise.
2. The caller tests engagement before dereference and uses `value_or` when a clear fallback is acceptable.
3. The program prints `Ada: 91` and `Unknown: 0`, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- Dereferencing a disengaged optional is invalid, while `value()` throws; choose and document the caller's absence policy.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when absence is expected and distinct from every valid value, without needing polymorphic ownership.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

Two lookups demonstrate the engaged and empty paths. No sentinel can be mistaken for a legitimate score.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- Optional makes absence part of the type, but API documentation must still explain why a value may be absent.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does std::optional and Representing an Absent Value address?
2. Medium — Does creating an empty `optional<int>` construct an `int` object?
3. Hard — When should an error result carry diagnostics instead of being represented by optional absence?

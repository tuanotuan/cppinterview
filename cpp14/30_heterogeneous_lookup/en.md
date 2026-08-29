# Day 30 — Heterogeneous Lookup

## 1. Problem It Solves

Searching a map whose key is `std::string` with another string-like type may otherwise create a temporary key just for lookup. Heterogeneous lookup uses a transparent comparator to search directly with a compatible alternative type.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Day 29 transparent comparators; maps, string construction, key equivalence, and iterator results.

## 3. Core Idea

The stored key type does not change. Only the lookup operation becomes templated, and the comparator must know how to order stored keys against the supplied probe in both directions.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
std::map<std::string, int, std::less<>> scores;
const char* probe = "mai";
auto it = scores.find(probe);
```

## 5. How It Works

1. The map stores owning string keys and integer scores in sorted tree order.
2. The transparent comparator accepts a `const char*` probe during `find` instead of requiring a named temporary `std::string`.
3. The iterator reaches the existing map entry and prints its score.

## 6. Common Mistakes

- Calling heterogeneous lookup with a type whose ordering is inconsistent with stored-key ordering can produce incorrect search behavior.
- Do not copy the pattern without checking transparent-comparator support, two-way comparison consistency, probe lifetime during the call, and iterator end checks. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when lookup is frequent and callers naturally hold a compatible non-key type that can avoid temporary construction.
- Avoid it when conversion cost is negligible, clarity suffers, or the comparator cannot safely order the probe type.

## 8. Simple Example

A score map owns `std::string` keys, while the caller has a C string probe. `std::less<>` lets `find` use that probe directly.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- Heterogeneous lookup changes the probe type, not the stored key type or ownership.
- The stored key type does not change. Only the lookup operation becomes templated, and the comparator must know how to order stored keys against the supplied probe in both directions.
- The compiler or library follows a precise rule; verify transparent-comparator support, two-way comparison consistency, probe lifetime during the call, and iterator end checks.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of Heterogeneous Lookup?
2. Medium — What iterator result indicates that the `"mai"` probe matched an existing key?
3. Hard — Why must a custom transparent comparator support a consistent ordering for both `(Key, Probe)` and `(Probe, Key)`?

# Day 29 — Ordered Containers and Transparent Comparators

## 1. Problem It Solves

Ordered containers maintain keys according to a comparator, and their notion of equivalence comes from that ordering rather than `operator==`. C++14 transparent comparators such as `std::less<>` can compare compatible key-like types.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 6, 25-27: containers, ordering, iterators, generic callables, and string values.

## 3. Core Idea

A tree asks only whether one key is less than another. A transparent comparator has a templated call operator and declares that lookup need not first construct the exact stored key type.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
std::set<std::string, std::less<>> names;
auto it = names.find("linh");
```

## 5. How It Works

1. The set stores strings in comparator order and rejects keys equivalent under that comparator.
2. `std::less<>` compares the stored `std::string` with a compatible lookup argument without fixing one operand type.
3. Iteration prints sorted names and lookup with a string literal finds the expected stored string.

## 6. Common Mistakes

- A comparator that is not a strict weak ordering can corrupt the container's logical invariants and make lookup unreliable.
- Do not copy the pattern without checking strict weak ordering, key immutability, comparator state, equivalence, and supported cross-type comparisons. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when sorted iteration, logarithmic search, or ordered uniqueness is required and a consistent comparator exists.
- Avoid it when ordering is unnecessary and hash-based lookup better matches measured access patterns.

## 8. Simple Example

A transparent string set stores three names. The comparator orders them lexicographically and accepts a string literal as a compatible search key.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- Ordered-container correctness depends on comparator ordering and equivalence, not merely stored key equality.
- A tree asks only whether one key is less than another. A transparent comparator has a templated call operator and declares that lookup need not first construct the exact stored key type.
- The compiler or library follows a precise rule; verify strict weak ordering, key immutability, comparator state, equivalence, and supported cross-type comparisons.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of Ordered Containers and Transparent Comparators?
2. Medium — In what order are `"lan"`, `"an"`, and `"minh"` printed by the set?
3. Hard — Why must both `comp(a, b)` and `comp(b, a)` be false for two keys to be equivalent in an ordered container?

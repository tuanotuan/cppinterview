# Day 26 — Iterator Categories, Invalidation, and Reverse Iterators

## 1. Problem It Solves

Algorithms require different traversal powers, and container mutations can make saved iterators unusable. Iterator categories describe supported operations, invalidation rules protect lifetime correctness, and reverse iterators adapt a range for backward traversal.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 6 and 25: containers, half-open ranges, capacity, reallocation, and algorithms.

## 3. Core Idea

An iterator is a position tied to a particular range, not a permanent index. Ask what category it has, whether an operation changed the underlying storage, and which direction adapter is being used.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
values.reserve(4);
auto first = values.begin();
values.push_back(4); // no reallocation within capacity
for (auto it = values.rbegin(); it != values.rend(); ++it) { }
```

## 5. How It Works

1. The vector reserves enough storage before an iterator to its first element is saved.
2. One insertion stays inside capacity, so the saved iterator remains valid; reverse iterators then traverse from the last element toward the first.
3. The original first value prints safely and reverse traversal prints all values in descending position order.

## 6. Common Mistakes

- Dereferencing an iterator after vector reallocation is undefined behavior even if its numeric address appears unchanged in a debugger.
- Do not copy the pattern without checking iterator category, owning container, mutation performed, documented invalidation rule, and the correct end sentinel. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when generic code needs to express traversal requirements or a container range must be visited backward.
- Avoid it when saved iterators cross uncontrolled mutations; reacquire them or redesign the loop.

## 8. Simple Example

Capacity is fixed at four before storing `begin`. A fourth insertion does not reallocate, then `rbegin` and `rend` produce a safe reverse range.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- Iterator validity is a documented consequence of the container operation, never something to guess from addresses.
- An iterator is a position tied to a particular range, not a permanent index. Ask what category it has, whether an operation changed the underlying storage, and which direction adapter is being used.
- The compiler or library follows a precise rule; verify iterator category, owning container, mutation performed, documented invalidation rule, and the correct end sentinel.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of Iterator Categories, Invalidation, and Reverse Iterators?
2. Medium — Why does the saved `begin` remain usable after the sample's final `push_back`?
3. Hard — Why is `rend()` a sentinel rather than an iterator that may be dereferenced to obtain an element before the first?

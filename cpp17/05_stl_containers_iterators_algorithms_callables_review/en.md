# Day 5 — Reviewing STL Containers, Iterators, Algorithms, and Callables

## 1. Problem It Solves

Hand-written loops repeatedly mix storage, traversal, selection, and transformation logic. The STL separates these responsibilities so containers own values, iterators delimit ranges, algorithms operate, and callables customize policy.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know `std::vector`, half-open ranges, lambda syntax, and iterator invalidation basics.

## 3. Core Idea

An algorithm receives `[first, last)` and does not own the sequence. A function object, function pointer, or lambda supplies behavior such as a predicate or transformation without coupling policy to the container.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
std::transform(values.begin(), values.end(),
               values.begin(), [](int x) { return x * x; });
```

## 5. How It Works

1. A vector stores fixed integers, `remove_if` moves unwanted elements behind a logical end, and `erase` removes them physically.
2. `std::transform` invokes a lambda once per remaining element and writes squares through an output iterator.
3. The program prints `squares: 4 16 36`, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- Calling only `remove_if` does not shrink a sequence container; its returned logical end must be passed to `erase`.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when an operation can be expressed as a standard range algorithm with a small, named policy.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

The erase-remove idiom keeps even values, then an in-place transformation squares them. A range-for loop only displays the final container.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- Prefer standard algorithms because their range and callable contracts make intent reviewable and reduce loop bookkeeping.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does Reviewing STL Containers, Iterators, Algorithms, and Callables address?
2. Medium — What part of the vector is specified immediately after `remove_if` but before `erase`?
3. Hard — Which vector iterator invalidation rule matters during erase?

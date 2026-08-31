# Day 49 — `std::flat_map` and `std::flat_multimap`

## 1. Problem It Solves

Node-based maps provide stable nodes and cheap individual insertion but poor cache locality. C++23 flat maps store sorted keys and values in contiguous underlying containers for a different performance tradeoff. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Day 40: constructing containers from ranges.
- Ordered associative containers and complexity basics.

## 3. Core Idea

Imagine a sorted table rather than a tree of boxes. Lookup uses ordered search; insertion may move a suffix. `flat_map` keeps unique keys, while `flat_multimap` permits repeats. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
std::flat_map<int, std::string> names{{1, "one"}};
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for `std::flat_map` and `std::flat_multimap`.
1. It creates unique-key and duplicate-key flat containers when the header exists. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks ordered key-value output or an exact support message, making the important behavior easy to verify.

## 6. Common Mistakes

- Frequent middle insertions can be costly and invalidate iterators; assuming reference stability like `std::map` is incorrect.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves lookup-heavy small or medium tables built mostly in batches and benefiting from locality.
- Avoid it when the task involves mutation-heavy workloads requiring stable node addresses or cheap individual insertion.

## 8. Simple Example

A command table is built once from sorted IDs and queried many times during program execution. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — Why can `flat_map` lookup be cache-friendly while insertion remains linear, and which workload characteristic decides whether that tradeoff wins?

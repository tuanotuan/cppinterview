# Day 47 — C++23 Range Search Algorithms

## 1. Problem It Solves

C++23 fills common search gaps with `contains`, `contains_subrange`, `starts_with`, `ends_with`, and `find_last`. Their names state the question directly and accept ranges rather than manual iterator pairs. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Day 5: ranges and projections.
- Days 42–46: composing range views.

## 3. Core Idea

Treat the algorithms as yes/no vocabulary plus one position query. Prefix and suffix checks compare aligned edges; last-search scans for the final matching position. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
bool has = std::ranges::contains(range, value);
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for C++23 Range Search Algorithms.
1. It asks all five questions about one fixed integer sequence when supported. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks true or false answers and the index of the last match, making the important behavior easy to verify.

## 6. Common Mistakes

- `find_last` returns a subrange rather than a single iterator; dereferencing its begin without checking emptiness is invalid when no match exists.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves readable boundary and membership checks on ranges with compatible equality semantics.
- Avoid it when the task involves locale-aware text search or cases requiring a more complex matching algorithm.

## 8. Simple Example

A protocol validator checks that a byte sequence starts with a header, ends with a marker, and contains a required flag. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — What exactly does an empty needle mean for `contains_subrange`, `starts_with`, and `ends_with`, and why should boundary cases be tested?

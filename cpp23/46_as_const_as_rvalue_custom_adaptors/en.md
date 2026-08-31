# Day 46 — `as_const`, `as_rvalue`, and Custom Range Adaptors

## 1. Problem It Solves

A pipeline may need read-only elements or permission to move elements from its source. C++23 provides `views::as_const` and `views::as_rvalue`, while adaptor closures let libraries add pipeable transformations. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Day 29: projecting cv/ref categories.
- Days 39 and 44–45: const ranges and adaptor pipelines.

## 3. Core Idea

These views change the access lens, not the storage. A custom adaptor is a reusable lens with `range | adaptor` spelling and clear forwarding of the underlying range. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
auto read_only = range | std::views::as_const;
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for `as_const`, `as_rvalue`, and Custom Range Adaptors.
1. It conditionally exposes const and rvalue access and pipes a range through a tiny custom take adaptor. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks read-only references, movable references, and a bounded custom view, making the important behavior easy to verify.

## 6. Common Mistakes

- Reading from an `as_rvalue` view does not itself move, but consuming elements into new objects may leave the source moved-from; a custom adaptor that stores a temporary by reference can dangle.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves generic pipelines that intentionally control mutability or ownership transfer.
- Avoid it when the task involves using `as_rvalue` merely for speed without deciding whether the source may be consumed.

## 8. Simple Example

A transfer pipeline moves strings from a staging vector into final storage and never reads the staging values afterward. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — Why does iterating `as_rvalue` not automatically modify the source, yet constructing a new `std::string` from each dereferenced element may do so?

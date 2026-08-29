# Day 38 — Inclusive, Exclusive, and Transform Scans

## 1. Problem It Solves

Many algorithms need every prefix result rather than one final reduction: running totals, offsets, cumulative products, and transformed prefixes. C++17 supplies scan algorithms for these patterns.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know prefix sums, ranges, output iterators, binary operations, and reduction ordering.

## 3. Core Idea

`inclusive_scan` includes the current input in each output, while `exclusive_scan` writes the prefix before the current input and therefore needs an initial value. Transform scans apply a unary transform before combination.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
std::inclusive_scan(first, last, out);
std::exclusive_scan(first, last, out, 0);
std::transform_inclusive_scan(first, last, out, plus, square);
```

## 5. How It Works

1. The same four integers feed inclusive, exclusive, and square-transform inclusive scans.
2. Separate fixed-size output arrays receive one result per input position, making prefix alignment visible.
3. The program prints `inclusive: 1 3 6 10`, `exclusive: 0 1 3 6`, and squared prefixes, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- Output storage must be large enough and non-overlap rules must be respected; parallel regrouping also requires suitable operations.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when every position needs a cumulative state, offset, index, or transformed prefix.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

A helper prints each result array so the inclusion boundary can be compared position by position.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- Choose inclusive versus exclusive from the meaning of output position zero, then select identity and transform explicitly.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does Inclusive, Exclusive, and Transform Scans address?
2. Medium — Why is the first exclusive output zero while the first inclusive output is one?
3. Hard — Which algebraic properties matter if a scan is executed in parallel?

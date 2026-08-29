# Day 36 — clamp, sample, not_fn, gcd, and lcm

## 1. Problem It Solves

Small common operations are often rewritten with subtle boundary, randomness, predicate, or arithmetic mistakes. C++17 adds standard vocabulary for clamping, sampling, predicate negation, greatest common divisors, and least common multiples.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know strict comparisons, random engines, predicates, iterators, integer arithmetic, and overflow limits.

## 3. Core Idea

`std::clamp` returns a value bounded by ordered limits, `std::sample` selects without replacement through a caller-supplied generator, `std::not_fn` wraps callable negation, and `gcd/lcm` implement standard integer number theory.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
auto bounded = std::clamp(value, low, high);
std::sample(first, last, out, count, engine);
auto odd = std::not_fn(is_even);
```

## 5. How It Works

1. Fixed integers exercise clamping, divisor calculations, and predicate negation.
2. A seeded random engine drives sampling; only sample size is printed so library-specific selection details do not affect the oracle.
3. The program prints `clamped: 10`, `gcd: 6`, `lcm: 42`, three odds, and sample size three, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- Clamp requires an ordered valid range, lcm can overflow the result type, and random reproducibility across library implementations is not guaranteed solely by engine seed.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when these exact standard operations match the domain rule and remove custom edge-case code.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

One program exercises all five facilities with small inputs, and every reported property remains deterministic across valid implementations.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- Standard vocabulary algorithms clarify intent, but preconditions, overflow, and randomness policy still belong to the caller.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does clamp, sample, not_fn, gcd, and lcm address?
2. Medium — Why does negating the even predicate count exactly three values?
3. Hard — Why can equal seeds still yield different sampled elements on different standard-library implementations?

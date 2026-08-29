# Day 28 — Numeric Algorithms and Basic Statistics

## 1. Problem It Solves

Summation, dot products, and simple statistics are common reduction patterns. The numeric algorithms express these operations directly and reduce indexing mistakes, while careful initial-value types control the arithmetic type.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 6 and 27: vectors, iterator ranges, algorithms, arithmetic conversions, and floating-point values.

## 3. Core Idea

A reduction folds a range into one accumulator. Choose the accumulator type first, then derive mean or variance from clearly named intermediate values and a stated population or sample formula.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
double sum = std::accumulate(values.begin(), values.end(), 0.0);
double squares = std::inner_product(values.begin(), values.end(),
                                    values.begin(), 0.0);
```

## 5. How It Works

1. `std::accumulate` adds every element into a double accumulator starting at `0.0`.
2. `std::inner_product` multiplies corresponding elements from the same range and sums the squares.
3. The mean and population variance are computed from the fixed data and printed as 5 and 5.

## 6. Common Mistakes

- Starting accumulation with integer zero can force integer arithmetic and truncate values even when the container holds floating-point numbers.
- Do not copy the pattern without checking accumulator type, empty-range behavior, overflow, numerical stability, and whether variance is population or sample. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when a standard reduction matches the formula and the data size is suitable for straightforward arithmetic.
- Avoid it when large or ill-conditioned data requires a more numerically stable online algorithm.

## 8. Simple Example

Four even values are reduced to a sum and sum of squares. The program divides by the known count to compute a population mean and variance.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- The initial accumulator value determines both identity and arithmetic type in many numeric algorithms.
- A reduction folds a range into one accumulator. Choose the accumulator type first, then derive mean or variance from clearly named intermediate values and a stated population or sample formula.
- The compiler or library follows a precise rule; verify accumulator type, empty-range behavior, overflow, numerical stability, and whether variance is population or sample.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of Numeric Algorithms and Basic Statistics?
2. Medium — What mean and population variance result from `{2.0, 4.0, 6.0, 8.0}`?
3. Hard — How could replacing the initial `0.0` with `0` change a calculation over non-integral input values?

# Day 37 — std::integer_sequence and std::index_sequence

## 1. Problem It Solves

A tuple stores values behind compile-time indices, but C++14 has no ordinary loop whose runtime index can become a template argument. `std::index_sequence` materializes indices as a parameter pack for expansion.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 33 and 36: tuples, `std::get<I>`, variadic templates, packs, and expansion.

## 3. Core Idea

An integer sequence is a type carrying compile-time numbers. `make_index_sequence<N>` builds `0, 1, ..., N-1`, which a helper function expands into repeated `std::get<I>` expressions.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
template<class Tuple, std::size_t... I>
void print(const Tuple& t, std::index_sequence<I...>);
```

## 5. How It Works

1. The tuple wrapper computes its number of element types with `sizeof...(Types)`.
2. `make_index_sequence` creates an index pack and the helper expands one `get` operation for each index.
3. All tuple elements print in positional order without handwritten overloads for tuple sizes.

## 6. Common Mistakes

- Generating a sequence with the wrong length makes an expanded `std::get<I>` index exceed tuple bounds at compile time.
- Do not copy the pattern without checking sequence length, index origin, target tuple size, expansion pattern, empty sequence, and evaluation order. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when compile-time positions must drive tuple, array, or callable expansion in C++14.
- Avoid it when a normal runtime container and loop already model homogeneous data.

## 8. Simple Example

A tuple of ID, name, and score is paired with indices 0, 1, and 2. Pack expansion calls `std::get` for each position and prints a comma-separated row.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- Index sequences bridge a compile-time count to a pack of compile-time positions.
- An integer sequence is a type carrying compile-time numbers. `make_index_sequence<N>` builds `0, 1, ..., N-1`, which a helper function expands into repeated `std::get<I>` expressions.
- The compiler or library follows a precise rule; verify sequence length, index origin, target tuple size, expansion pattern, empty sequence, and evaluation order.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of std::integer_sequence and std::index_sequence?
2. Medium — What indices are contained in `std::make_index_sequence<3>`?
3. Hard — Why can a runtime `for` loop variable not be passed directly as the non-type template argument to `std::get<I>`?

# Day 8 — Structured Bindings

## 1. Problem It Solves

Accessing tuple-like results through repeated `std::get` calls hides the meaning of each component. Structured bindings introduce local names for array, tuple-like, or eligible aggregate elements.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know arrays, aggregates, `std::pair`, references, and value versus reference binding.

## 3. Core Idea

`auto [name, score] = record` creates bindings for decomposed elements. Add `&` or `const &` when names must alias rather than copy the underlying object.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
std::pair<std::string, int> result{"Ada", 91};
auto& [name, score] = result;
score += 4;
```

## 5. How It Works

1. A pair is decomposed into two reference bindings with descriptive names.
2. Updating the score changes the original pair's second element because `auto&` requests aliases.
3. The program prints `Ada: 95` and confirmation that the original pair stores 95, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- Plain `auto` copies the decomposed object; modifications then affect the bindings' hidden copy rather than the source.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when a fixed-shape result has components that deserve meaningful local names.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

The code binds to a pair by reference, increments one component, and prints through both binding and original object to demonstrate aliasing.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- Structured bindings improve naming, but their copy/reference qualifier determines lifetime and mutation behavior.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does Structured Bindings address?
2. Medium — What changes if `auto& [name, score]` becomes plain `auto [name, score]`?
3. Hard — How are the hidden binding object and individual names related for tuple-like decomposition?

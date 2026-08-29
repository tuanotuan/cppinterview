# Day 28 — std::string_view and Non-Owning Lifetime

## 1. Problem It Solves

Read-only string processing often needs only a character range, yet taking or creating `std::string` values can allocate and copy. `std::string_view` represents a cheap non-owning view.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know contiguous character storage, pointers and lengths, substrings, and object lifetime.

## 3. Core Idea

A string view stores a pointer and size but neither owns nor null-terminates the viewed data. Copying a view is cheap; every use still requires the original character storage to remain alive and unmodified in ways that invalidate pointers.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
std::string_view first_word(std::string_view text) {
    return text.substr(0, text.find(' '));
}
```

## 5. How It Works

1. A function receives a view over a live owned string and returns a subview for its first word.
2. No character allocation occurs; both views continue to reference the same stable string buffer during printing.
3. The program prints `first: Modern` and the source length, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- Returning a view into a temporary string or retaining one across source reallocation creates a dangling view that can still appear non-empty.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when an API reads a substring during a clearly bounded owner lifetime and does not need ownership.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

The owning string is declared in `main` and outlives both views, so the returned first-word view remains valid while printed.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- A view optimizes ownership away; its lifetime contract must be stricter and more visible than a copied string's.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does std::string_view and Non-Owning Lifetime address?
2. Medium — Which object owns the characters printed through the returned view?
3. Hard — Which `std::string` mutations can invalidate existing views and why?

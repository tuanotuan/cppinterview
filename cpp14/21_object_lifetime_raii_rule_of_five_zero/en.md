# Day 21 — Object Lifetime, RAII, Rule of Five, and Rule of Zero

## 1. Problem It Solves

Resources must be released on every path, including early returns and exceptions. RAII binds cleanup to object lifetime; the Rule of Five identifies special operations a manual resource owner may need, while the Rule of Zero delegates them to reliable member types.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 3, 11, and 18: ownership, moves, destructors, scopes, and smart pointers.

## 3. Core Idea

An object's lifetime is a bracket: construction acquires a valid state and destruction closes it. Prefer members such as `std::vector` and `std::unique_ptr` so generated copy, move, and destruction behavior does the right work.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
struct Buffer {
    std::vector<int> data; // Rule of Zero
};
```

## 5. How It Works

1. A scope creates a value-owning buffer whose vector acquires storage during construction.
2. Copying duplicates vector elements and moving transfers vector state through already-correct library special members.
3. Leaving scope destroys every buffer and releases its storage automatically without manual `delete`.

## 6. Common Mistakes

- Manually defining one ownership-related special member while forgetting the others can cause leaks, double release, or accidentally disabled moves.
- Do not copy the pattern without checking construction, destruction order, copy versus move semantics, self-assignment, and member ownership. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when an object should maintain a valid resource invariant for exactly its lifetime.
- Avoid it when manual special-member code merely repeats behavior already provided by standard RAII members.

## 8. Simple Example

A `Buffer` contains only a vector, so it follows the Rule of Zero. The program copies one buffer, moves the copy, and lets scope exit perform all cleanup.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- Rule of Zero is the default; write the Rule of Five only when the class truly manages a raw resource boundary.
- An object's lifetime is a bracket: construction acquires a valid state and destruction closes it. Prefer members such as `std::vector` and `std::unique_ptr` so generated copy, move, and destruction behavior does the right work.
- The compiler or library follows a precise rule; verify construction, destruction order, copy versus move semantics, self-assignment, and member ownership.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of Object Lifetime, RAII, Rule of Five, and Rule of Zero?
2. Medium — After moving the copied vector into `moved`, which object owns the elements used for output?
3. Hard — Why can adding only a user-declared destructor change implicit move generation even when the destructor body looks harmless?

# Day 22 — API Design with Values, References, Pointers, and Ownership

## 1. Problem It Solves

A function signature is more than a type checker: it communicates copying, mutation, optionality, borrowing, and ownership transfer. Choosing value, reference, raw pointer, or smart pointer deliberately makes API contracts visible at the call site.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 2-3, 18, and 21: references, pointers, moves, smart pointers, lifetime, and RAII.

## 3. Core Idea

Use a value for an independent input or output, `T&` for a required mutable borrow, `const T&` for a required read-only borrow, `T*` for a nullable borrow, and a smart pointer for ownership.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
void increment(int& value);
const int* find(const std::vector<int>& values, int target);
std::unique_ptr<int> make_score(int value);
```

## 5. How It Works

1. Each parameter or return type encodes whether the callee may copy, mutate, return no object, or create an owner.
2. Borrowed references and pointers remain tied to caller-owned lifetime, while the smart-pointer result owns a new allocation.
3. The caller can read the found value, observe mutation, and hold the newly created score with unambiguous cleanup.

## 6. Common Mistakes

- Returning a pointer or reference to a local object exposes storage that is already dead when the caller uses it.
- Do not copy the pattern without checking nullability, mutability, copy cost, owner identity, lifetime, and whether transfer occurs. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when the chosen form accurately states the function's data-flow and lifetime contract.
- Avoid it when a raw pointer is being used to hide ownership or an output parameter obscures a simple value return.

## 8. Simple Example

The sample mutates one integer through a reference, searches a vector through a read-only reference and nullable pointer result, then creates an owned score with `std::make_unique`.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- A good API makes ownership and borrowing visible in types instead of relying on comments.
- Use a value for an independent input or output, `T&` for a required mutable borrow, `const T&` for a required read-only borrow, `T*` for a nullable borrow, and a smart pointer for ownership.
- The compiler or library follows a precise rule; verify nullability, mutability, copy cost, owner identity, lifetime, and whether transfer occurs.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of API Design with Values, References, Pointers, and Ownership?
2. Medium — Which sample function can return no matching object, and how does its return type represent that outcome?
3. Hard — Why would accepting a `std::unique_ptr<T>` by value communicate a different contract from accepting `T*`?

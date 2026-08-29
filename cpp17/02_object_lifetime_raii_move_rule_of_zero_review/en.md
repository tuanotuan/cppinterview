# Day 2 — Reviewing Object Lifetime, RAII, Move Semantics, and Rule of Zero

## 1. Problem It Solves

Manual cleanup paths multiply when functions return early or throw. RAII binds release to object lifetime, while Rule of Zero types delegate ownership to standard members that already implement copying, moving, and destruction correctly.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Understand scopes, constructors, destructors, values, references, and the purpose of `std::move`.

## 3. Core Idea

An object starts lifetime after valid initialization and ends it at destruction. Prefer members such as `std::string`, `std::vector`, and smart pointers so the enclosing class needs no custom destructor, copy constructor, or move constructor.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
struct Batch {
    std::string name;
    std::vector<int> values;
};
Batch moved = std::move(source);
```

## 5. How It Works

1. A Rule of Zero aggregate owns its text and dynamic sequence through standard-library value members.
2. Compiler-generated move operations ask each member to move; source and destination remain valid objects until their scopes end.
3. The program prints the destination name and count, plus a Boolean showing the moved-from source remains valid, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- A moved-from object is valid but its old value is generally unspecified; only operations allowed by its type's documented contract are safe.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when a class owns resources that can be represented by existing RAII value types.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

The batch has no user-declared special member functions. Moving it transfers reusable state efficiently, and automatic destruction later releases every member without a cleanup branch.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- Use Rule of Zero first; write special members only when the class itself owns a resource whose policy cannot be expressed by a standard RAII member.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does Reviewing Object Lifetime, RAII, Move Semantics, and Rule of Zero address?
2. Medium — Which object owns the vector elements after the move, and what may still safely be done with the source?
3. Hard — How does declaring a destructor manually affect implicit move generation?

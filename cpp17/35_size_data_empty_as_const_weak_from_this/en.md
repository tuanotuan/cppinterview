# Day 35 — size, data, empty, as_const, and weak_from_this

## 1. Problem It Solves

Generic code should inspect built-in arrays and containers uniformly, request const access explicitly, and observe shared objects without extending ownership. C++17 adds small utilities for each need.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know arrays, containers, pointer ranges, const overloads, `shared_ptr`, `weak_ptr`, and `enable_shared_from_this`.

## 3. Core Idea

`std::size`, `std::data`, and `std::empty` provide uniform access. `std::as_const` selects a const view without copying, and `weak_from_this` obtains a non-owning observer tied to the existing shared control block.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
std::size(array);
std::data(container);
std::empty(container);
std::as_const(value);
weak_from_this();
```

## 5. How It Works

1. Array utilities report bounds and first data, while `as_const` exposes a const reference.
2. A heap-owned node calls `weak_from_this` only after a `shared_ptr` establishes its control block.
3. The program prints array size/data state plus a non-expired weak observer, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- `weak_from_this` on an object not managed by a shared control block returns an empty observer; it does not create shared ownership.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when generic utilities or callback graphs need clear constness and non-owning observation.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

The fixed array is never copied, and the node's weak observer is verified while its shared owner remains alive.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- Small standard utilities remove ad hoc overloads, while weak observation must remain subordinate to an explicit owning lifetime.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does size, data, empty, as_const, and weak_from_this address?
2. Medium — Does `std::as_const(values)` create another array?
3. Hard — Why is calling `shared_from_this` on an unowned object more dangerous than `weak_from_this`?

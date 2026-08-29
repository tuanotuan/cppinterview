# Day 20 — Lambda Capture *this and Object Lifetime

## 1. Problem It Solves

Capturing `this` copies only a pointer, so a callback that outlives its object can dereference a dangling pointer. C++17 adds `[*this]` to capture a snapshot of the object by value.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know lambda captures, member functions, copying, object lifetime, and asynchronous callback risks.

## 3. Core Idea

`[*this]` stores a copy of the current object inside the closure. Member access in the lambda refers to that copy, so later changes or destruction of the original do not invalidate the snapshot, assuming copying each member is safe.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
auto snapshot() const {
    return [*this] { return value_; };
}
```

## 5. How It Works

1. A member function creates a callback while the object stores 10, then the original object changes to 99.
2. The closure retains its copied member value and can safely run after the local original object leaves scope.
3. The program prints `snapshot: 10` even though the original was changed, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- A shallow object copy may still contain raw pointers or views that dangle; `[*this]` copies representation according to member copy semantics, not an entire external object graph.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when a callback needs immutable snapshot semantics and the object's copy operation captures every required lifetime safely.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

The callback escapes a helper scope, then prints the earlier value. No reference or original-object pointer is retained.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- `[*this]` solves pointer lifetime only to the extent that copying the object's members creates an independent valid snapshot.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does Lambda Capture *this and Object Lifetime address?
2. Medium — Why does the callback return 10 rather than 99?
3. Hard — Which pointer-like members can still make a copied closure unsafe after the original context disappears?

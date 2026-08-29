# Day 40 — CRTP, Static Polymorphism, and Virtual Polymorphism

## 1. Problem It Solves

Several types may share an interface either with compile-time binding or runtime dispatch. CRTP passes the derived type to a base template for static polymorphism, while virtual functions select an override through a base reference or pointer at runtime.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 21, 34, and 39: inheritance, templates, object lifetime, callables, and virtual functions.

## 3. Core Idea

CRTP knows the concrete derived type during compilation and uses `static_cast` to call it. Virtual polymorphism stores runtime type information behind a stable base interface and usually dispatches through a vtable.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
template<class Derived>
struct StaticBase { void run() { static_cast<Derived*>(this)->impl(); } };

struct VirtualBase { virtual void run() const = 0; };
```

## 5. How It Works

1. The CRTP base forwards a call to a compile-time-known derived implementation.
2. A separate virtual base invokes an override through a base reference whose concrete object is known only at runtime.
3. Both approaches print their implementation labels, but their binding and storage trade-offs differ.

## 6. Common Mistakes

- Using CRTP as though it allowed one heterogeneous runtime collection confuses static polymorphism with a common erased base.
- Do not copy the pattern without checking binding time, need for heterogeneous storage, code-size growth, virtual destructor, ownership, and performance measurements. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when CRTP fits compile-time customization; virtual dispatch fits runtime substitution through one stable interface.
- Avoid it when either pattern adds inheritance where composition or a simple template parameter would be clearer.

## 8. Simple Example

A static worker is called through its CRTP base, while a dynamic worker is called through a virtual base reference. The identical-looking output hides different dispatch mechanisms.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- Static and virtual polymorphism solve different binding-time and storage problems.
- CRTP knows the concrete derived type during compilation and uses `static_cast` to call it. Virtual polymorphism stores runtime type information behind a stable base interface and usually dispatches through a vtable.
- The compiler or library follows a precise rule; verify binding time, need for heterogeneous storage, code-size growth, virtual destructor, ownership, and performance measurements.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of CRTP, Static Polymorphism, and Virtual Polymorphism?
2. Medium — Which call can the compiler bind directly to a concrete implementation in the sample?
3. Hard — Why does deleting a derived object through a polymorphic base pointer require a virtual base destructor?

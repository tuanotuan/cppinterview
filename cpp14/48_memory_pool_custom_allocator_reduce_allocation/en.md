# Day 48 — Memory Pools, Custom Allocators, and Reducing Allocation

## 1. Problem It Solves

Frequent general-purpose allocations can add latency, metadata overhead, fragmentation, and poor locality. A memory pool reserves storage in larger blocks and a custom allocation interface constructs objects in reusable slots.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 21, 24-25, and 47: lifetime, alignment, placement new, containers, locality, and measured allocation cost.

## 3. Core Idea

Separate raw storage from object lifetime. Acquiring a slot does not create a `T` until placement construction runs, and releasing an object must call its destructor before marking that slot reusable.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
void* slot = &storage[index];
T* object = new (slot) T(value);
object->~T();
```

## 5. How It Works

1. A fixed pool contains aligned raw slots and a parallel used-state array.
2. Creation finds a free slot and starts object lifetime with placement new; destruction ends lifetime and returns the slot.
3. Two integers are constructed and printed without per-object heap allocation, then both slots are explicitly released.

## 6. Common Mistakes

- Reusing storage before destroying the live object, misaligning slots, or letting a pointer outlive the pool causes undefined behavior.
- Do not copy the pattern without checking alignment, slot ownership, construction/destruction pairing, exhaustion policy, exception rollback, thread safety, and measured benefit. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when many same-shaped objects have bounded lifetimes and profiling identifies allocation as a bottleneck.
- Avoid it when standard values, `reserve`, or a proven allocator already solve the issue with lower risk.

## 8. Simple Example

A two-slot pool constructs two integers in `std::aligned_storage`. The pool tracks which slots are live and calls destructors before reuse.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- Pools optimize allocation policy but make raw storage and object-lifetime correctness the programmer's responsibility.
- Separate raw storage from object lifetime. Acquiring a slot does not create a `T` until placement construction runs, and releasing an object must call its destructor before marking that slot reusable.
- The compiler or library follows a precise rule; verify alignment, slot ownership, construction/destruction pairing, exhaustion policy, exception rollback, thread safety, and measured benefit.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of Memory Pools, Custom Allocators, and Reducing Allocation?
2. Medium — What must happen to an object before its pool slot can safely be marked free?
3. Hard — How should pool creation roll back slot state if a constructor throws after a slot was selected?

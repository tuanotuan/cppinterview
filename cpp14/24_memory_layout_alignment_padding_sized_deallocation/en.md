# Day 24 — Memory Layout, Alignment, Padding, and Sized Deallocation

## 1. Problem It Solves

Object members must appear at addresses suitable for their types, so compilers may insert padding and round object size for arrays. C++14 also standardizes sized deallocation, allowing a delete function to receive the size of the object being released.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 18, 21, and 23: object lifetime, allocation, deletion, `sizeof`, and non-throwing cleanup.

## 3. Core Idea

Layout is a sequence of aligned member slots, not a packed concatenation. `alignof`, `sizeof`, and `offsetof` reveal the implementation's decisions for standard-layout types.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
struct Layout { char tag; int value; short code; };
static void operator delete(void* p, std::size_t size) noexcept;
```

## 5. How It Works

1. The compiler assigns aligned offsets to each member and may insert unused bytes between or after them.
2. Deleting the sample node selects its class-specific sized deallocation function and passes the allocation size.
3. The program prints implementation-specific layout facts and confirms the size delivered to deallocation.

## 6. Common Mistakes

- Assuming member offsets or total size are portable across compilers and architectures can break binary formats and network protocols.
- Do not copy the pattern without checking standard-layout requirements, alignment, padding, ABI, allocation/deallocation pairing, and serialized byte order. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when interfacing with hardware, ABIs, allocators, or performance-sensitive packed data requires measured layout facts.
- Avoid it when raw object layout is being treated as a portable serialization format.

## 8. Simple Example

A standard-layout struct exposes member offsets and alignment. A small class defines only sized `operator delete`, so deletion reports the size passed by the implementation.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- Layout is an ABI property to inspect, while serialized representation should be designed explicitly.
- Layout is a sequence of aligned member slots, not a packed concatenation. `alignof`, `sizeof`, and `offsetof` reveal the implementation's decisions for standard-layout types.
- The compiler or library follows a precise rule; verify standard-layout requirements, alignment, padding, ABI, allocation/deallocation pairing, and serialized byte order.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of Memory Layout, Alignment, Padding, and Sized Deallocation?
2. Medium — Why is the offset of `value` commonly greater than one even though `tag` occupies one byte?
3. Hard — Why must allocation and deallocation functions remain a compatible pair even when the deallocator receives a size?

# Day 32 — queue, priority_queue, and Ring Buffers

## 1. Problem It Solves

Different workloads need different removal rules. `std::queue` provides FIFO order, `std::priority_queue` exposes the highest-priority element, and a ring buffer reuses fixed storage with wrapped indices.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 25-26 and 31: sequence storage, container adapters, fixed-size arrays, indices, and complexity.

## 3. Core Idea

A queue models arrival order, a heap-backed priority queue models rank, and a ring maps logical position to `(head + offset) % capacity`. Select by semantics before micro-optimizing.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
std::queue<int> fifo;
std::priority_queue<int> priorities;
slot = ring[(head + offset) % ring.size()];
```

## 5. How It Works

1. The FIFO and priority adapters receive the same fixed values but expose different next elements.
2. The ring-buffer insertion overwrites the oldest slot once fixed capacity is full and advances the logical head.
3. The sample prints FIFO front 3, priority top 9, and the ring's retained sequence 20, 30, 40.

## 6. Common Mistakes

- Calling `front` or `top` on an empty adapter is undefined behavior; capacity-full policy must also be explicit for rings.
- Do not copy the pattern without checking ordering semantics, empty state, full-buffer policy, wraparound arithmetic, capacity, and synchronization needs. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when processing order is FIFO, priority-ranked, or bounded streaming with predictable storage.
- Avoid it when random access or arbitrary middle deletion is the dominant operation.

## 8. Simple Example

Three tiny structures receive fixed numbers. The ring has capacity three; inserting a fourth value deliberately drops the oldest one to demonstrate overwrite policy.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- Queue choice is a statement about which element becomes available next and what storage bounds exist.
- A queue models arrival order, a heap-backed priority queue models rank, and a ring maps logical position to `(head + offset) % capacity`. Select by semantics before micro-optimizing.
- The compiler or library follows a precise rule; verify ordering semantics, empty state, full-buffer policy, wraparound arithmetic, capacity, and synchronization needs.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of queue, priority_queue, and Ring Buffers?
2. Medium — After pushing 3, 9, and 5, what do FIFO `front` and priority `top` return?
3. Hard — When a full overwrite ring receives a fourth value at capacity three, how must `head` change to preserve logical order?

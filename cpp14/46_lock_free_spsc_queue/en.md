# Day 46 — A Lock-Free SPSC Queue

## 1. Problem It Solves

A single producer and single consumer can exchange bounded items without a mutex when each side owns one index. An SPSC ring uses atomic head and tail publication plus fixed storage, avoiding allocation in the steady state.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 32 and 43-45: ring buffers, atomics, release/acquire ordering, false sharing, and single-owner roles.

## 3. Core Idea

The producer alone writes `tail` and buffer slots before a release store. The consumer alone writes `head` after reading a slot, while acquire loads observe the other side's published progress.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
buffer[tail] = value;
tail.store(next, std::memory_order_release);

if (head != tail.load(std::memory_order_acquire)) { /* pop */ }
```

## 5. How It Works

1. The producer retries bounded pushes for values 10, 20, and 30; only it updates the tail index.
2. The consumer retries pops, reads only published slots, and advances the head with release ordering.
3. After both threads join, the received array prints the original FIFO order without mutexes or dynamic allocation.

## 6. Common Mistakes

- Using the same queue with multiple producers or consumers violates its ownership assumptions and creates races.
- Do not copy the pattern without checking one-producer/one-consumer invariant, capacity-minus-one rule, index wraparound, publication order, object lifetime, and progress. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when exactly one producer and one consumer exchange small bounded data under measured latency requirements.
- Avoid it when roles are multiple or dynamic, blocking is acceptable, or a proven library queue is available.

## 8. Simple Example

A capacity-four array exposes three usable slots to distinguish full from empty. Two threads transfer three integers and main prints the received values after joining.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- Lock-free SPSC correctness comes from fixed roles, index ownership, and precise publication ordering.
- The producer alone writes `tail` and buffer slots before a release store. The consumer alone writes `head` after reading a slot, while acquire loads observe the other side's published progress.
- The compiler or library follows a precise rule; verify one-producer/one-consumer invariant, capacity-minus-one rule, index wraparound, publication order, object lifetime, and progress.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of A Lock-Free SPSC Queue?
2. Medium — Why does a ring with four physical slots expose only three usable queue positions in this design?
3. Hard — Which write must happen-before the consumer reads a slot, and how do release tail-store plus acquire tail-load establish that relation?

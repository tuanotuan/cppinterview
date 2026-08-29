# Day 46 — A Lock-Free SPSC Queue

## 1. Problem It Solves

A single producer and single consumer may need a bounded low-latency channel without mutex blocking. A ring buffer with separately owned indices can implement this narrow concurrency contract.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know ring buffers, atomics, acquire/release publication, cache contention, and fixed-capacity tradeoffs.

## 3. Core Idea

Only the producer writes the head index and only the consumer writes the tail. Release stores publish a completed slot or completed removal; matching acquire loads prevent a side from reusing a slot before the other side's work is visible.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
buffer[head] = value;
head_.store(next, std::memory_order_release);
const auto head = head_.load(std::memory_order_acquire);
```

## 5. How It Works

1. A producer pushes four fixed integers into a bounded ring while one consumer pops exactly four.
2. One slot remains unused to distinguish full from empty, and failed operations yield until progress is possible.
3. The program prints `received: 10 20 30 40`, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- Adding a second producer or consumer breaks index ownership assumptions; wraparound, destruction, and non-trivial element lifetimes also need a more complete design.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when topology is exactly one producer and one consumer, capacity is bounded, and latency measurements justify lock-free complexity.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

The demonstration uses integers so slot lifetime is simple. Thread joins and fixed counts avoid a separate shutdown protocol.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- Lock-free means system progress without a lock, not automatic wait-freedom, fairness, or superior performance.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does A Lock-Free SPSC Queue address?
2. Medium — Why does a four-slot ring hold at most three queued values in this design?
3. Hard — Which happens-before edge protects reading a slot after the producer writes it?

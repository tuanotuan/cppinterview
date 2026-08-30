# Day 42 — Latch and Reusable Barrier

## 1. Problem It Solves

A latch waits for a one-time countdown, while a barrier repeatedly gathers a fixed group at phase boundaries and may run a completion step. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Threads, phases, atomics, and blocking synchronization.
- You should be able to compile a short program and read its output.

## 3. Core Idea

A latch is a disposable finish gate. A barrier is a revolving gate: everyone arrives, the phase completes, and the gate resets for the next lap. Read `std::barrier` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
std::latch done{2};
std::barrier phase{2};
```

## 5. How It Works

1. The program introduces the smallest relevant form of `std::barrier`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- Destroying a synchronization object while threads use it is invalid; missing an expected arrival can deadlock the whole phase.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when workers have a clear one-time completion point or repeat synchronized phases.
- Avoid it when participants can disappear unpredictably without correctly dropping from the barrier.

## 8. Simple Example

Two jthreads count down a latch, then two more cross a barrier twice while a completion counter records phases. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `std::barrier` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `std::barrier` in the minimal example?
2. Medium — Why can the latch not simply be reset and reused after its count reaches zero?
3. Hard — What exact deadlock occurs if a barrier expects two arrivals but one participant exits before calling `arrive_and_wait`?

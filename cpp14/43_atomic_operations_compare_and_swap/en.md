# Day 43 — Atomic Operations and Compare-and-Swap

## 1. Problem It Solves

A read-check-write sequence on shared data can interleave between threads. Atomic compare-and-swap performs that conditional transition as one atomic operation: update only if the current value equals an expected value.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 7 and 41-42: atomics, threads, shared state, memory ordering names, and synchronization.

## 3. Core Idea

CAS asks, is state still what I observed? On success it writes the desired value. On failure it leaves the atomic unchanged and overwrites `expected` with the value actually observed.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
int expected = 0;
bool changed = state.compare_exchange_strong(expected, 1);
```

## 5. How It Works

1. The first strong CAS compares atomic state zero with expected zero and requests state one.
2. It succeeds atomically; a second attempt expecting zero fails because the current state is already one.
3. The sample prints success, final state one, second failure, and the failure-updated expected value one.

## 6. Common Mistakes

- Ignoring that failure modifies `expected` can break retry loops or compare against a stale assumption.
- Do not copy the pattern without checking desired transition, expected-value update, weak versus strong choice, retry loop, memory order, and progress requirements. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when a small shared state transition must be conditional and lock-free design is justified.
- Avoid it when the invariant spans multiple independent objects or a mutex would be simpler and easier to verify.

## 8. Simple Example

An atomic state moves from idle zero to running one. Repeating the same expected transition shows the failure path and the changed `expected` argument.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- CAS atomically couples comparison and update, with an in/out expected argument.
- CAS asks, is state still what I observed? On success it writes the desired value. On failure it leaves the atomic unchanged and overwrites `expected` with the value actually observed.
- The compiler or library follows a precise rule; verify desired transition, expected-value update, weak versus strong choice, retry loop, memory order, and progress requirements.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of Atomic Operations and Compare-and-Swap?
2. Medium — What values do `state` and `expected` hold after the second CAS fails?
3. Hard — Why is `compare_exchange_weak` commonly placed in a retry loop even when the observed value appears equal?

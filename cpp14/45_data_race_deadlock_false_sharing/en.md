# Day 45 — Data Races, Deadlocks, and False Sharing

## 1. Problem It Solves

Concurrent code can be wrong through unsynchronized conflicting access, stop through cyclic lock waiting, or run slowly because independent atomics share a cache line. These are respectively data races, deadlocks, and false sharing.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 7 and 41-44: mutexes, atomics, lock ordering, memory ordering, cache concepts, and thread joining.

## 3. Core Idea

Correctness comes first: map every shared access to synchronization and impose a lock acquisition rule. After correctness, inspect hardware contention and separate frequently written independent data when measurements justify it.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
std::lock(first_mutex, second_mutex);
std::lock_guard<std::mutex> first(first_mutex, std::adopt_lock);
struct alignas(64) Counter { std::atomic<int> value{0}; };
```

## 5. How It Works

1. Two workers acquire both mutexes with `std::lock` before updating ordinary shared totals.
2. Separate cache-line-aligned counter objects are incremented atomically without conflicting ordinary accesses.
3. The program completes without deadlock or data race and prints deterministic totals and counter values.

## 6. Common Mistakes

- Adding atomics to some variables does not repair a data race on other shared objects or eliminate multi-object invariants.
- Do not copy the pattern without checking every conflicting access, global lock order, blocking calls under locks, cache-line placement, contention, and measured throughput. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when reviewing or designing multithreaded state with explicit correctness and cache-performance requirements.
- Avoid it when padding and lock-free complexity are added before profiling shows a real bottleneck.

## 8. Simple Example

Each worker safely increments two totals under jointly acquired locks, then updates its own aligned atomic counter. The design illustrates prevention without intentionally executing undefined behavior or deadlock.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- Data races and deadlocks are correctness failures; false sharing is a measured cache-coherence cost.
- Correctness comes first: map every shared access to synchronization and impose a lock acquisition rule. After correctness, inspect hardware contention and separate frequently written independent data when measurements justify it.
- The compiler or library follows a precise rule; verify every conflicting access, global lock order, blocking calls under locks, cache-line placement, contention, and measured throughput.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of Data Races, Deadlocks, and False Sharing?
2. Medium — Why does using `std::lock` for both mutexes avoid the simple opposite-order deadlock pattern?
3. Hard — Why can two independent atomic counters still slow each other when they occupy the same frequently invalidated cache line?

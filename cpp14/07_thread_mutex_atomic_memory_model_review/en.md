# Day 7 — Reviewing thread, mutex, atomic, and the C++ Memory Model

## 1. Problem It Solves

Multiple threads may execute at the same time and touch shared memory. The threading library starts work, a mutex protects compound non-atomic operations, atomics provide indivisible operations, and the memory model defines when accesses form a data race.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 1-6; functions, lambdas, RAII-style scope, and the difference between shared and local state.

## 3. Core Idea

Thread interleaving is nondeterministic. Every shared write needs a synchronization story: either the same mutex guards all accesses or an atomic operation supplies the required ordering.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
std::lock_guard<std::mutex> lock(m);
counter.fetch_add(1, std::memory_order_relaxed);
```

## 5. How It Works

1. Two worker threads receive independent input values but update shared counters.
2. A lock guard serializes changes to the ordinary integer, while an atomic increment safely counts completed events.
3. Joining both threads establishes completion before main reads and prints the final totals.

## 6. Common Mistakes

- Writing the same ordinary variable from multiple threads without synchronization is a data race and therefore undefined behavior.
- Do not copy the pattern without checking which objects are shared, which synchronization operation covers each access, and when threads are joined. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when independent work can overlap and shared state has a clear, minimal synchronization design.
- Avoid it when the work is tiny, inherently sequential, or synchronization cost and complexity exceed the benefit.

## 8. Simple Example

Two workers add fixed amounts to a protected total and increment an atomic event count. The default join order does not matter because the mutex and atomic remove conflicting unsynchronized accesses.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- Correct concurrent code maps every shared access to a happens-before or mutual-exclusion rule.
- Thread interleaving is nondeterministic. Every shared write needs a synchronization story: either the same mutex guards all accesses or an atomic operation supplies the required ordering.
- The compiler or library follows a precise rule; verify which objects are shared, which synchronization operation covers each access, and when threads are joined.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of Reviewing thread, mutex, atomic, and the C++ Memory Model?
2. Medium — Why is the final total always 30 even though either worker may run first?
3. Hard — Why is `memory_order_relaxed` sufficient for the independent event count here but not automatically sufficient to publish unrelated data?

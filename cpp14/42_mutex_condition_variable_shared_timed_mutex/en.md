# Day 42 — mutex, condition_variable, and std::shared_timed_mutex

## 1. Problem It Solves

Threads need to protect shared state without wasting CPU while waiting, and read-heavy data may permit simultaneous readers. A mutex guards a predicate, `condition_variable` blocks until notification, and `shared_timed_mutex` separates exclusive writers from shared readers.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 7 and 41: threads, mutex ownership, happens-before, predicates, waiting, and joining.

## 3. Core Idea

The condition variable is not the condition; the protected predicate is. Always wait in a loop or predicate overload, because wakeups may be spurious, then acquire the data's appropriate read or write lock.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
cv.wait(lock, [&] { return ready; });
std::unique_lock<std::shared_timed_mutex> write(data_mutex);
std::shared_lock<std::shared_timed_mutex> read(data_mutex);
```

## 5. How It Works

1. A producer takes an exclusive data lock, writes 42, then sets the readiness predicate under its ordinary mutex.
2. Notification wakes the waiter, whose predicate recheck establishes readiness before it takes a shared read lock.
3. The reader observes the published value safely, and the explicit thread is joined.

## 6. Common Mistakes

- Waiting without a protected predicate can lose notifications or accept a spurious wakeup as real work.
- Do not copy the pattern without checking predicate mutex, notification timing, lock ordering, reader/writer ownership, timeout behavior, and thread completion. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when a thread must sleep for a state change or read-heavy access benefits from shared locking.
- Avoid it when the state can be transferred by message or future more simply, or contention measurements show no benefit.

## 8. Simple Example

One producer publishes a fixed integer. Main waits on a Boolean predicate without spinning, then takes a shared lock to read the protected value.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- Condition variables coordinate state transitions; mutexes still protect the predicate and data.
- The condition variable is not the condition; the protected predicate is. Always wait in a loop or predicate overload, because wakeups may be spurious, then acquire the data's appropriate read or write lock.
- The compiler or library follows a precise rule; verify predicate mutex, notification timing, lock ordering, reader/writer ownership, timeout behavior, and thread completion.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of mutex, condition_variable, and std::shared_timed_mutex?
2. Medium — Why does the predicate overload of `wait` remain correct after a spurious wakeup?
3. Hard — What deadlock risk appears if threads acquire the readiness mutex and data mutex in inconsistent orders?

# Day 40 — atomic_ref, Atomic Wait/Notify, and Atomic Smart Pointers

## 1. Problem It Solves

C++20 can apply atomic operations to suitable existing storage, block efficiently until atomic values change, and atomically publish shared-pointer ownership. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Atomics, shared ownership, alignment, and thread synchronization.
- You should be able to compile a short program and read its output.

## 3. Core Idea

`atomic_ref` lends atomic controls to an object, wait/notify is a doorbell for value changes, and atomic smart pointers publish both pointer and ownership safely. Read `std::atomic_ref` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
std::atomic_ref<int> ref{value};
ref.wait(old_value);
ref.notify_one();
```

## 5. How It Works

1. The program introduces the smallest relevant form of `std::atomic_ref`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- Every access to an object while an atomic_ref governs concurrent use must follow atomic rules; alignment and lifetime requirements are strict.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when existing aligned storage needs atomic access, polling should become blocking, or shared ownership must be published atomically.
- Avoid it when a mutex-protected compound invariant is simpler.

## 8. Simple Example

The example increments an `int` through atomic_ref, wakes a waiting thread, and stores/loads a shared pointer atomically. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `std::atomic_ref` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `std::atomic_ref` in the minimal example?
2. Medium — Why does the waiter recheck the atomic value after waking instead of treating notification alone as the state?
3. Hard — What data race appears if another thread writes the referenced `int` non-atomically while `atomic_ref` operations are active?

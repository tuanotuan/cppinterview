# Day 39 — Function Pointers, Functors, Generic Lambdas, and std::function

## 1. Problem It Solves

C++ represents callable behavior in several forms with different state, genericity, and storage costs. Function pointers name free functions, functors carry typed state, generic lambdas offer concise templated calls, and `std::function` type-erases compatible callables behind one signature.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 4, 9, 27, and 34: functions, objects, call operators, lambdas, templates, and type erasure basics.

## 3. Core Idea

Separate the callable's concrete type from the call signature. Keep the concrete type when compile-time optimization and state matter; use type erasure only when heterogeneous callables must share one runtime slot.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
int (*pointer)(int, int) = add;
Multiplier functor{3};
auto lambda = [](auto a, auto b) { return a - b; };
std::function<int(int, int)> operation = pointer;
```

## 5. How It Works

1. Three concrete callable forms implement addition, stateful multiplication, and generic subtraction.
2. `std::function<int(int, int)>` stores each compatible callable in turn behind the same runtime call interface.
3. Calls through the pointer, functor, lambda, and erased wrapper print distinct deterministic results.

## 6. Common Mistakes

- `std::function` can allocate and adds indirection; it also requires a copyable target in C++14, so move-only closures do not fit directly.
- Do not copy the pattern without checking state needs, genericity, copyability, lifetime, target signature, allocation, and call overhead. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when the lightest callable form meets the design, or runtime storage truly needs one erased signature.
- Avoid it when type erasure is added where a template parameter or concrete lambda type is simpler and faster.

## 8. Simple Example

The sample calls each form directly, then assigns the free function to `std::function`. This reveals common syntax without pretending the forms have identical cost.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- Callable abstractions trade state, genericity, runtime flexibility, and overhead; choose deliberately.
- Separate the callable's concrete type from the call signature. Keep the concrete type when compile-time optimization and state matter; use type erasure only when heterogeneous callables must share one runtime slot.
- The compiler or library follows a precise rule; verify state needs, genericity, copyability, lifetime, target signature, allocation, and call overhead.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of Function Pointers, Functors, Generic Lambdas, and std::function?
2. Medium — Which callable in the sample stores a multiplier value as object state?
3. Hard — Why can a move-only lambda from Day 11 not be copied into C++14 `std::function` even when its call signature matches?

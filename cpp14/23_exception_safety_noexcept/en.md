# Day 23 — Exception Safety and noexcept

## 1. Problem It Solves

Operations can fail after partially doing work. Exception safety defines which program invariants and values remain valid when an exception escapes, while `noexcept` promises that a function will not let exceptions propagate.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 18, 21, and 22: RAII, ownership, function contracts, constructors, and destructors.

## 3. Core Idea

Build changes in temporary RAII-managed state, then commit only after success. Mark a function `noexcept` only when every operation it performs can honor that promise; otherwise an escaping exception terminates the program.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
int divide(int a, int b);       // may throw
void reset(int& state) noexcept; // must not throw
```

## 5. How It Works

1. The division function checks its precondition before performing arithmetic and throws on a zero divisor.
2. A `try`/`catch` boundary handles the expected failure, while the reset operation has a non-throwing contract.
3. The error message is printed, execution continues, and the state is reset safely to zero.

## 6. Common Mistakes

- Adding `noexcept` merely for optimization without auditing callees can turn a recoverable exception into termination.
- Do not copy the pattern without checking the basic or strong guarantee, resource cleanup, commit point, throwing callees, and the declared exception contract. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when failure is exceptional and callers need a clear guarantee about surviving state; use `noexcept` for truly non-throwing operations.
- Avoid it when errors are ordinary control flow better represented by a value, or the function cannot honestly keep a non-throwing promise.

## 8. Simple Example

A checked integer division reports invalid input by exception. The caller catches it, then invokes a tiny `noexcept` reset whose behavior is independently verifiable.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- Exception safety describes valid state after failure; `noexcept` describes propagation, not whether failure is imaginable.
- Build changes in temporary RAII-managed state, then commit only after success. Mark a function `noexcept` only when every operation it performs can honor that promise; otherwise an escaping exception terminates the program.
- The compiler or library follows a precise rule; verify the basic or strong guarantee, resource cleanup, commit point, throwing callees, and the declared exception contract.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of Exception Safety and noexcept?
2. Medium — After the zero-divisor exception is caught, does `main` continue to call `reset`?
3. Hard — What happens if a function declared `noexcept` calls another operation that throws and does not catch it?

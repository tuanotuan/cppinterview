# Day 19 — std::exchange and Move-Based State Transitions

## 1. Problem It Solves

State-transition code often needs both the previous value and a replacement. C++14 `std::exchange` moves or copies out the old value, assigns the new value, and returns the old one in one explicit expression.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 3 and 18: move semantics, assignment, old versus new object state, and ownership transfer.

## 3. Core Idea

Read `exchange(object, replacement)` as take-and-replace: first save the current state, then assign the replacement, then hand the saved state to the caller.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
auto old_state = std::exchange(state, new_state);
```

## 5. How It Works

1. The current value initializes the function result, using move construction when appropriate.
2. The replacement is assigned to the original object before the saved old value is returned.
3. The caller receives the old state while the original variable visibly contains the new state.

## 6. Common Mistakes

- Confusing `std::exchange` with `std::swap` is wrong because swap updates both supplied objects and returns nothing.
- Do not copy the pattern without checking the moved-from old value, assignment cost, replacement conversion, and exception behavior. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when a state machine, move operation, handle reset, or counter transition needs the previous state.
- Avoid it when ordinary assignment is enough and the old value is never used.

## 8. Simple Example

An integer state changes from 7 to 0. The returned old value and the updated variable are printed side by side, making take-and-replace behavior unambiguous.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- `std::exchange` packages a common state transition while preserving access to the previous value.
- Read `exchange(object, replacement)` as take-and-replace: first save the current state, then assign the replacement, then hand the saved state to the caller.
- The compiler or library follows a precise rule; verify the moved-from old value, assignment cost, replacement conversion, and exception behavior.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of std::exchange and Move-Based State Transitions?
2. Medium — After `old = std::exchange(state, 0)` when `state` was 7, what are both variables?
3. Hard — In a move assignment operator, why can `std::exchange(other.pointer, nullptr)` express ownership transfer and source reset together?

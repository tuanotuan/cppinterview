# Day 10 — Lambda Init-Capture

## 1. Problem It Solves

C++11 capture normally copies or references an existing local variable with the same name. C++14 init-capture lets a closure create its own member from an arbitrary expression and optionally give that member a clearer name.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 2, 4, and 9: type deduction, value/reference capture, lambda calls, and generic lambdas.

## 3. Core Idea

Read an init-capture like a private data-member initializer: the expression is evaluated when the lambda object is created, and the new capture name exists inside the body.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
int base = 10;
auto twice = [value = base * 2] { return value; };
```

## 5. How It Works

1. The expression on the right side of the capture initializer is evaluated once at closure construction.
2. Its result initializes a new closure member named `value`, whose type is deduced like `auto`.
3. Changing the outside variable afterward does not change the stored initialized capture.

## 6. Common Mistakes

- Expecting the initializer expression to run again on every lambda call confuses closure construction with invocation.
- Do not copy the pattern without checking evaluation time, the new capture name, its deduced type, and whether the body needs `mutable`. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when a closure needs a transformed snapshot, renamed state, or a value produced only for the closure.
- Avoid it when a normal capture communicates the same intent more simply or live reference semantics are required.

## 8. Simple Example

A base price is doubled during closure construction and stored as `snapshot`. Reassigning the original price afterward proves that the closure owns the earlier computed value.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- Init-capture creates closure-owned state from an expression at lambda construction time.
- Read an init-capture like a private data-member initializer: the expression is evaluated when the lambda object is created, and the new capture name exists inside the body.
- The compiler or library follows a precise rule; verify evaluation time, the new capture name, its deduced type, and whether the body needs `mutable`.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of Lambda Init-Capture?
2. Medium — If `base` changes after `[snapshot = base * 2]` is evaluated, what does the lambda return?
3. Hard — How does the deduced type of an init-capture differ from explicitly capturing an existing reference variable by reference?

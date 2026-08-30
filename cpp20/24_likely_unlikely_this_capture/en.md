# Day 24 — likely, unlikely, and Explicit this Capture

## 1. Problem It Solves

Branch-likelihood attributes communicate an optimization hint, while explicit `this` capture makes a lambda’s dependence on its object visible. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Conditions, lambdas, classes, and captures.
- You should be able to compile a short program and read its output.

## 3. Core Idea

The attribute is a traffic forecast, not a rule; `[this]` is an explicit cable back to the current object rather than a copy of that object. Read `[[likely]]` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
if (condition) [[likely]] { /* common path */ }
auto f = [this] { return value; };
```

## 5. How It Works

1. The program introduces the smallest relevant form of `[[likely]]`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- Wrong likelihood hints may hurt performance, and a lambda capturing `this` dangles if it runs after the object has died.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when profiling supports a strongly biased branch or a short-lived lambda must access members.
- Avoid it when branch behavior is unknown or the callback may outlive its object.

## 8. Simple Example

A counter returns a `[this]` lambda and marks the ordinary positive branch as likely. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `[[likely]]` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `[[likely]]` in the minimal example?
2. Medium — Does `[this]` copy the entire object, and which member value does the lambda read?
3. Hard — Why is a lifetime bug from `[this]` unaffected by whether the marked branch is actually likely?

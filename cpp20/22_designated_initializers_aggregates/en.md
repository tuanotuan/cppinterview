# Day 22 — Designated Initializers and Aggregate Initialization

## 1. Problem It Solves

Designated initializers make aggregate construction readable by naming the members that receive values. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Structs, member declaration order, and list initialization.
- You should be able to compile a short program and read its output.

## 3. Core Idea

An aggregate is a simple open record. A designator is a label placed on an initializer so readers need not remember only positional meaning. Read `.member = value` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
Settings s{.width = 800, .height = 600, .fullscreen = false};
```

## 5. How It Works

1. The program introduces the smallest relevant form of `.member = value`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- C++ designators must follow declaration order and cannot freely skip backward as in some other languages; the type must remain an aggregate.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when a simple data record has several fields and named initialization improves clarity.
- Avoid it when the type protects invariants through constructors or is no longer an aggregate.

## 8. Simple Example

A settings aggregate receives width, height, and fullscreen values with member names visible at the call site. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `.member = value` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `.member = value` in the minimal example?
2. Medium — What values do omitted aggregate members receive when value initialization applies?
3. Hard — Why can adding a user-declared constructor make existing designated initialization fail even if the same member names remain?

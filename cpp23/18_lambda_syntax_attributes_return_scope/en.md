# Day 18 — Lambda Syntax, Attributes, and Trailing-Return Scope

## 1. Problem It Solves

C++23 regularizes lambda grammar: attributes can target the generated call operator, parentheses can be omitted in more forms, and trailing-return lookup sees the intended lambda scope. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Days 14–15: lambda closure objects and static lambdas.
- Attributes and trailing return types.

## 3. Core Idea

A lambda is an unnamed class with a call operator. Attribute position states which generated entity receives metadata, while the trailing return describes that operator's result. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
auto f = [] [[nodiscard]] (int x) -> decltype(x) { return x * 2; };
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for Lambda Syntax, Attributes, and Trailing-Return Scope.
1. It calls a lambda whose call operator carries an attribute and an explicit trailing return. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks a predictable doubled value, making the important behavior easy to verify.

## 6. Common Mistakes

- Putting an attribute in the wrong slot can apply it to the closure type or function type instead of the call operator, or be rejected by the compiler.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves generic lambdas whose return type or diagnostics benefit from explicit declaration.
- Avoid it when the task involves adding attributes or trailing returns that communicate no useful constraint or intent.

## 8. Simple Example

A conversion callback marks its result `[[nodiscard]]` because silently ignoring the converted value is probably a bug. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — If an init-capture has the same name as an outer variable but a different type, which declaration should C++23 trailing-return lookup use?

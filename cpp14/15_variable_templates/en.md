# Day 15 — Variable Templates

## 1. Problem It Solves

Before C++14, a type-dependent constant usually needed a function template or a static member inside a class template. A variable template directly describes a family of variables indexed by template arguments.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 5 and 14: templates, type parameters, `constexpr`, and explicit template arguments.

## 3. Core Idea

Treat the declaration as a compile-time table keyed by type. Writing `pi<float>` and `pi<double>` selects two separately typed constant instantiations.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
template<class T>
constexpr T pi = T(3.1415926535897932385L);
```

## 5. How It Works

1. The template argument determines the declared type of a particular variable-template specialization.
2. The initializer converts the common literal to that type during constant initialization.
3. The program uses the double specialization to compute and print a circle area.

## 6. Common Mistakes

- Defining a non-constant variable template in a header without understanding linkage can create surprising shared state or definitions.
- Do not copy the pattern without checking the template arguments, instantiated variable type, initializer conversion, constness, and linkage. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when a named constant or trait value naturally varies by type or another compile-time parameter.
- Avoid it when one ordinary constant is sufficient or a function communicates lazy computation more accurately.

## 8. Simple Example

A typed `pi` variable template avoids repeating separate float and double constants. The sample chooses `pi<double>` for a radius represented as double.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- Variable templates give values the same parameterized reuse that function and class templates give behavior and types.
- Treat the declaration as a compile-time table keyed by type. Writing `pi<float>` and `pi<double>` selects two separately typed constant instantiations.
- The compiler or library follows a precise rule; verify the template arguments, instantiated variable type, initializer conversion, constness, and linkage.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of Variable Templates?
2. Medium — What type does `pi<float>` have, and where does the conversion from the long-double literal occur?
3. Hard — Why can a variable template in a header require more care about linkage and definitions than a local `constexpr` variable?

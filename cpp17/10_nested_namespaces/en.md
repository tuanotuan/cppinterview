# Day 10 — Nested Namespaces

## 1. Problem It Solves

Deep namespace hierarchies previously required repeated nested blocks with many closing braces. That boilerplate made boundaries harder to scan and invited mismatched comments.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Understand namespaces, qualified names, internal organization, and the One Definition Rule at a basic level.

## 3. Core Idea

C++17 allows `namespace company::product::math { ... }` as a concise nested definition. It is organizational syntax: lookup, linkage, and qualification behave as though separate nested blocks were written.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
namespace app::math {
int square(int value) { return value * value; }
}
```

## 5. How It Works

1. A function is defined inside a three-level namespace using one compact header.
2. The fully qualified name identifies the same scopes that three traditional namespace declarations would create.
3. The program prints `square: 49` from a fully qualified call, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- Concise syntax does not justify extremely deep hierarchies, and `using namespace` directives can still pollute lookup.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when a stable module or library hierarchy genuinely needs multiple namespace levels.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

The sample defines and calls one square function using explicit qualification. No global using directive hides ownership of the name.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- Nested-namespace syntax removes braces, not architectural responsibility; namespaces should still describe meaningful ownership boundaries.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does Nested Namespaces address?
2. Medium — What fully qualified name denotes the function, and how would pre-C++17 nesting look?
3. Hard — Why does namespace syntax create no runtime object, allocation, or access-control boundary?

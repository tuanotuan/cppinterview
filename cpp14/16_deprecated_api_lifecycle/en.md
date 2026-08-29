# Day 16 — [[deprecated]] and the API Lifecycle

## 1. Problem It Solves

Removing an old API immediately breaks users, but leaving it silently encourages new dependencies. The standard `[[deprecated]]` attribute keeps the declaration available while asking compilers to warn callers and optionally explain the replacement.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Day 1 diagnostics; functions, declarations, call sites, and the idea of maintaining a public API over time.

## 3. Core Idea

Deprecation is a staged migration signal, not deletion. First add a replacement, then mark the old entry point, migrate callers, and only remove it in a separately announced breaking release.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
[[deprecated("use new_total instead")]]
int old_total(int a, int b);
```

## 5. How It Works

1. The attribute attaches a diagnostic message to the old declaration while preserving its signature and binary behavior.
2. A conforming compiler may emit a warning when source code names or calls that declaration.
3. The sample uses the replacement API and therefore compiles cleanly while leaving the marked old declaration visible for study.

## 6. Common Mistakes

- Marking an API deprecated without a migration message or usable replacement gives callers no practical next step.
- Do not copy the pattern without checking the replacement path, warning policy, compatibility window, documentation, and planned removal version. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when an existing public interface must remain temporarily available while callers move to a safer design.
- Avoid it when the declaration was never released or can be renamed safely before anyone depends on it.

## 8. Simple Example

The file declares `old_total` with a replacement message and calls only `new_total`. Uncommenting an old call is a deliberate way to observe the compiler diagnostic.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- A good deprecation has a replacement, a migration period, and an explicit removal policy.
- Deprecation is a staged migration signal, not deletion. First add a replacement, then mark the old entry point, migrate callers, and only remove it in a separately announced breaking release.
- The compiler or library follows a precise rule; verify the replacement path, warning policy, compatibility window, documentation, and planned removal version.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of [[deprecated]] and the API Lifecycle?
2. Medium — Which function call in the sample compiles without a deprecation warning, and why?
3. Hard — Why is changing behavior behind the deprecated signature more dangerous than keeping it compatible during migration?

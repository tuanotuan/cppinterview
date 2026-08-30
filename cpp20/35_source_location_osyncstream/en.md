# Day 35 — source_location and osyncstream

## 1. Problem It Solves

`source_location` captures call-site metadata without macros, and `osyncstream` buffers output so a completed chunk reaches a shared stream atomically. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Functions, default arguments, streams, and threads.
- You should be able to compile a short program and read its output.

## 3. Core Idea

Source location is a caller-address stamp; an output sync stream is an envelope that keeps one message together before delivering it. Read `std::source_location` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
void log(std::string_view msg, std::source_location where = std::source_location::current());
```

## 5. How It Works

1. The program introduces the smallest relevant form of `std::source_location`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- Line numbers change when source lines move, and `osyncstream` prevents character interleaving but does not impose a deterministic order between threads.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when diagnostics need file/function/line context or concurrent messages must remain intact.
- Avoid it when stable machine-readable IDs or globally ordered logging are required.

## 8. Simple Example

A logging function records its call-site line and writes one complete message through `std::osyncstream`. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `std::source_location` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `std::source_location` in the minimal example?
2. Medium — Why does the default `source_location::current()` report the caller rather than the line inside the function body?
3. Hard — What concurrency guarantee does `osyncstream` provide, and which ordering guarantee does it deliberately not provide?

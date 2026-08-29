# Day 1 — Toolchain, Compiler Flags, and C++14 Mode

## 1. Problem It Solves

A C++ source file does not define its own language mode or warning policy. The toolchain and command-line flags decide whether C++14 syntax is accepted, which diagnostics are shown, and how source files become an executable.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- A text editor, a terminal, and the idea that a source file must be translated before it can run.

## 3. Core Idea

Think of the toolchain as a pipeline: preprocess, compile, assemble, then link. The compile command is a contract that selects the C++ standard and asks the compiler to report suspicious code.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
g++ -std=c++14 -Wall -Wextra -Wpedantic main.cpp -o app
```

## 5. How It Works

1. The driver reads the source file and applies the requested C++14 language rules plus the three warning groups.
2. After preprocessing and translation, the linker combines the produced object code with the required standard-library code.
3. Running the executable prints the value of the C++ version macro and a value created with valid C++14 syntax.

## 6. Common Mistakes

- Compiling without an explicit `-std=c++14` flag can silently use another default standard, hiding a compatibility problem.
- Do not copy the pattern without checking the selected standard, warning flags, source names, and link options. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when you compile every exercise, test portability, or create a reproducible build command.
- Avoid it when you rely on hidden IDE defaults without knowing which compiler and language mode they select.

## 8. Simple Example

The sample rejects modes older than C++14 with a preprocessor check, then prints `__cplusplus` and a binary mask. This makes the chosen mode visible instead of merely assuming it.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- A reproducible C++ build always names the language standard and useful warning levels.
- Think of the toolchain as a pipeline: preprocess, compile, assemble, then link. The compile command is a contract that selects the C++ standard and asks the compiler to report suspicious code.
- The compiler or library follows a precise rule; verify the selected standard, warning flags, source names, and link options.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of Toolchain, Compiler Flags, and C++14 Mode?
2. Medium — With GCC in C++14 mode, what does the condition `__cplusplus >= 201402L` evaluate to?
3. Hard — Why can code compile with the compiler default yet fail when the same file is rebuilt with `-std=c++14 -Wpedantic`?

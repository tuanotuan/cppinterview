# Day 1 — Toolchain, Compiler Flags, and C++17 Mode

## 1. Problem It Solves

Source code alone does not select a language standard, warning policy, optimizer, or linker inputs. An explicit build command makes every exercise reproducible and proves that C++17 syntax is really accepted.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know how to open a terminal, save a source file, and distinguish compilation from running an executable.

## 3. Core Idea

Treat the toolchain as preprocess, compile, assemble, and link stages. The option `-std=c++17` selects language rules; `-Wall -Wextra -Wpedantic` requests useful diagnostics, and `-pthread` supplies thread support for later lessons.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
g++ -std=c++17 -Wall -Wextra -Wpedantic -pthread main.cpp -o app
```

## 5. How It Works

1. The preprocessor checks `__cplusplus` before the compiler translates a structured-binding declaration.
2. In conforming C++17 mode the macro is at least `201703L`; an older selected mode stops at the explicit error.
3. The program prints the language-level number and `sum: 42`, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- Relying on an IDE or compiler default can accidentally accept a newer extension or reject required C++17 syntax on another machine.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when a build must behave consistently in a terminal, editor, CI runner, and teammate's environment.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

A pair is unpacked with a structured binding, a feature unavailable before C++17. The version guard and printed sum make both the selected standard and program behavior visible.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- Record compiler identity, version, standard mode, warnings, optimization level, and link options as part of the program.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does Toolchain, Compiler Flags, and C++17 Mode address?
2. Medium — Which value range must `__cplusplus` satisfy when this file is compiled as C++17?
3. Hard — Why can compilation succeed yet the final link fail when a required library option is omitted?

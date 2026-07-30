# Day 30 — Toolchain, Compiler Flags, and C++11 Mode

## 1. Problem It Solves

C++ source code is plain text. A toolchain turns that source into a runnable
program and reports many mistakes before the program reaches production.

For this lesson, the compiler must use C++11 mode. Warning flags are enabled so
suspicious code is visible even when it is technically valid C++.

## 2. Prerequisites

No previous C++ lesson is required. You only need to know how to open a terminal,
move to a directory, and identify a file ending in `.cpp`.

## 3. Core Idea

A simple native build has four conceptual stages:

1. The preprocessor expands directives such as `#include`.
2. The compiler checks C++ grammar and types, then produces object code.
3. The linker combines object files with required library code.
4. The operating system loads and starts the executable at `main()`.

The executable is a separate file from the source code. A failed build does not
replace an older executable, so running the command again after a failure may
accidentally run stale code.

## 4. Minimal Commands

Compile with GCC:

```text
g++ -std=c++11 -Wall -Wextra -Wpedantic source.cpp -o program
```

Run on Linux or macOS:

```text
./program
```

Run on Windows PowerShell:

```text
.\program.exe
```

Important options:

- `-std=c++11` selects the C++11 language rules.
- `-Wall` enables many common diagnostics.
- `-Wextra` enables additional useful diagnostics.
- `-Wpedantic` reports extensions outside the selected standard.
- `-o program` chooses the executable name.

Use `g++`, not `gcc`, for the final C++ link command. `g++` automatically links
the C++ standard library.

## 5. Compile and Link Separately

A multi-file build can compile each source file first:

```text
g++ -std=c++11 -Wall -Wextra -Wpedantic -c feed.cpp -o feed.o
g++ -std=c++11 -Wall -Wextra -Wpedantic -c main.cpp -o main.o
```

Then link the object files:

```text
g++ feed.o main.o -o feed-check
```

This separation matters because changing one source file should not require
recompiling every other source file. Build systems such as CMake model these
dependencies and issue the necessary compiler and linker commands.

## 6. Debug and Release Options

A useful local debug build commonly adds:

```text
-O0 -g
```

`-O0` keeps optimization low, while `-g` emits debugging information. A release
build commonly uses an optimization level such as `-O2`. Optimization affects
performance and generated code; it is not a substitute for correctness checks,
tests, or warnings.

The exact compiler version and options are build inputs. CI and production
should record them so a failure can be reproduced.

## 7. Exit Status

A return value of `0` from `main()` means success. A non-zero value normally
signals an error:

```cpp
if (bid_price > ask_price) {
    std::cerr << "Invalid quote\n";
    return 1;
}
```

Shell scripts and CI jobs use this exit status to decide whether a step passed.

## 8. Common Mistakes

- Forgetting `-std=c++11`, so the compiler default varies between machines.
- Ignoring warnings because the program still builds.
- Using `gcc` instead of `g++` for the final C++ link command.
- Running an old executable after compilation failed.
- Assuming successful compilation proves the program is correct.
- Mixing incompatible compiler, standard-library, or ABI settings.
- Applying `-Werror` blindly to third-party headers and turning external
  warnings into local build failures.

## 9. Trading-System Relevance

A tick-data program may validate a quote where the bid price must not exceed the
ask price. The same source should behave consistently on a developer laptop, a
test server, and a production machine. An explicit standard mode, strict
warnings, repeatable compiler versions, and a failing exit status reduce
environment-dependent surprises.

## 10. Key Takeaways

- Select the C++ version explicitly.
- Compile with warnings and investigate them.
- Treat compilation and linking as distinct build stages.
- Do not confuse a successful build with a correct program.
- Make toolchain versions and options reproducible.

## 11. Self-Check Questions

1. What does `-std=c++11` control?
2. Why should warnings be fixed even when compilation succeeds?
3. What is the difference between a `.cpp` file, an object file, and an
   executable?
4. Why can running a command after a failed build execute stale code?
5. Why should CI preserve the compiler version and build options?

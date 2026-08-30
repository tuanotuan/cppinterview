# Day 26 — Module Interfaces, Implementation Units, and import

## 1. Problem It Solves

Modules provide named compiled interfaces that avoid textual header inclusion and separate exported API from hidden implementation. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Separate translation units, declarations, definitions, and linking.
- You should be able to compile a short program and read its output.

## 3. Core Idea

The interface is a service counter, the implementation is the back room, and an importer sees only what the counter explicitly exports. Read `export module` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
export module math;
export int add(int, int);
```

## 5. How It Works

1. The program introduces the smallest relevant form of `export module`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- A real module requires multiple translation units and compiler-specific build ordering; placing interface, implementation, and importer in one ordinary source is not a real module build.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when a project and toolchain can manage module dependency scanning and stable interface boundaries.
- Avoid it when a tiny portable example must be built as one ordinary translation unit.

## 8. Simple Example

Because this course requires one runnable `.cpp` per day, the program prints the three exact source fragments needed for a real multi-file module. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `export module` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `export module` in the minimal example?
2. Medium — Which declaration makes `add` visible to an importing translation unit?
3. Hard — Why must the interface unit be compiled before an importer even though final symbol resolution still involves the linker?

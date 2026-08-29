# Day 11 — Inline Variables and the One Definition Rule

## 1. Problem It Solves

Header-defined global or static data traditionally required an out-of-class definition or risked multiple-definition linker errors. Inline variables let one logical variable be defined identically in several translation units.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know headers, translation units, linkage, class static members, and the basic One Definition Rule.

## 3. Core Idea

An inline variable may have identical definitions in multiple translation units and still denotes one entity with one address. C++17 also makes a `constexpr` static data member implicitly inline.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
struct Config {
    inline static std::string mode = "C++17";
    inline static int reads = 0;
};
```

## 5. How It Works

1. Two functions access the same inline static counter declared and initialized inside the class definition.
2. The linker coalesces permitted identical definitions into one program entity instead of reporting duplicate external definitions.
3. The program prints `mode: C++17` and `reads: 2`, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- Inline does not permit different initializers or definitions across translation units; violating ODR can still make the program ill-formed with no required diagnostic.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when header-only constants or shared static data need one program-wide identity.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

A header-style configuration type keeps both its text and counter definitions inside the class. Separate helper calls update the same counter.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- Inline variables solve definition placement, not uncontrolled global state; prefer immutability and narrow interfaces.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does Inline Variables and the One Definition Rule address?
2. Medium — How many counter objects exist when the same valid inline definition appears in several translation units?
3. Hard — Which differences between supposedly identical inline definitions violate ODR, and why might no diagnostic appear?

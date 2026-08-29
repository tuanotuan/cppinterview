# Day 32 — std::filesystem

## 1. Problem It Solves

Portable path manipulation and directory operations previously depended on platform APIs or third-party libraries. C++17 standardizes paths, status queries, iteration, and common file operations.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know path components, relative versus absolute paths, error handling, and the difference between lexical and filesystem operations.

## 3. Core Idea

`std::filesystem::path` stores a path in the platform's native model and exposes component-aware operations. Methods such as `lexically_normal` transform syntax without touching the filesystem, while queries and mutations may fail through exceptions or `std::error_code`.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
namespace fs = std::filesystem;
fs::path path{"logs/../data/report.txt"};
auto normalized = path.lexically_normal();
```

## 5. How It Works

1. A relative path containing a parent component is normalized entirely in memory.
2. Component-aware member functions extract filename, stem, extension, and create a changed copy without assuming a slash character.
3. The program prints normalized and extension-replaced generic path strings, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- Lexical normalization does not resolve symbolic links or prove existence; security-sensitive canonicalization must account for actual filesystem state and races.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when code needs portable component-aware path construction, inspection, traversal, or file operations.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

The example performs no external write, making it deterministic while still demonstrating path joining, normalization, filename access, and extension replacement.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- Treat paths as structured values and separate lexical transformation from filesystem-dependent queries.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does std::filesystem address?
2. Medium — Does `lexically_normal` check whether the normalized path exists?
3. Hard — When should an operation use an `error_code` overload instead of exceptions?

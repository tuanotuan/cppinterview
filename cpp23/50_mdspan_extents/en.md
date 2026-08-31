# Day 50 — `std::mdspan`, Extents, and Multidimensional Data

## 1. Problem It Solves

Multidimensional data is often stored in one contiguous buffer. `std::mdspan` provides a non-owning indexed view, while extents describe each dimension as static or runtime-sized. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Day 5: non-owning views.
- Day 16: multidimensional indexing.

## 3. Core Idea

The buffer is a warehouse floor, extents are its row and column measurements, and mdspan is the coordinate map. It does not own or resize the warehouse. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
std::mdspan matrix(data.data(), rows, columns);
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for `std::mdspan`, Extents, and Multidimensional Data.
1. It wraps six integers as a two-by-three matrix and reads one coordinate when supported. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks the value at row one, column two, making the important behavior easy to verify.

## 6. Common Mistakes

- The backing storage must outlive the mdspan, and indexing outside any extent is undefined behavior; extents do not allocate or validate an unrelated buffer size.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves numeric kernels, images, matrices, and tensor interfaces over externally owned memory.
- Avoid it when the task involves data that needs ownership, resizing, or automatic bounds checking from the view itself.

## 8. Simple Example

A six-value image buffer is viewed as two rows and three columns without copying a pixel. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — If an extent is static in the type, what size information is stored at runtime, and what happens when the supplied buffer is actually too small?

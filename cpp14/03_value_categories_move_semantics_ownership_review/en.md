# Day 3 — Reviewing Value Categories, Move Semantics, and Ownership

## 1. Problem It Solves

Copying a resource-owning object may be expensive or forbidden. Move semantics lets code transfer a resource from an object that is about to be discarded, while value categories tell overload resolution which expressions may be moved from.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 1-2; lvalue references, temporary objects, destructors, and `std::unique_ptr` from C++11.

## 3. Core Idea

An lvalue names a stable object; an rvalue is usually temporary or explicitly made move-eligible. `std::move` does not move bytes itself—it casts so a move operation may be selected.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
std::unique_ptr<int> a = std::make_unique<int>(42);
auto b = std::move(a);
```

## 5. How It Works

1. A unique owner is created, so copying is disabled by the smart-pointer type.
2. Casting the source to an rvalue lets the move constructor transfer the stored pointer into the destination.
3. The destination owns the integer and the moved-from source remains valid but becomes empty.

## 6. Common Mistakes

- Using an object as though its old value were guaranteed after moving from it can create logic bugs.
- Do not copy the pattern without checking who owns the resource before and after the move and which moved-from operations are valid. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when ownership is unique and a resource can be transferred instead of copied.
- Avoid it when the source must retain its original value or shared ownership is the real requirement.

## 8. Simple Example

A dynamically allocated score starts in `source`. Moving the smart pointer into `destination` transfers deletion responsibility, and a Boolean check confirms that `source` is now empty.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- Move semantics is primarily a transfer of state or ownership, not a promise that the source is destroyed.
- An lvalue names a stable object; an rvalue is usually temporary or explicitly made move-eligible. `std::move` does not move bytes itself—it casts so a move operation may be selected.
- The compiler or library follows a precise rule; verify who owns the resource before and after the move and which moved-from operations are valid.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of Reviewing Value Categories, Move Semantics, and Ownership?
2. Medium — After moving a `std::unique_ptr`, what do the Boolean states of the source and destination report?
3. Hard — Why is `std::move(x)` only a cast, and which constructor or assignment operator performs the actual transfer?

# Day 31 — `const`, Pointers, and Lvalue References

## 1. Problem It Solves

C++ programs often need to access the same object from several places without
making unnecessary copies. The type system should also communicate whether:

- the object may be changed through a particular name;
- an object is required or optional;
- a function works with the caller's original object; and
- an address may later be redirected to another object.

`const`, pointers, and lvalue references express these constraints directly in
function signatures and variable declarations.

## 2. Prerequisites

Before this lesson, you should know:

- how to define a `.cpp` file and `main()`;
- how to compile in C++11 mode;
- basic variables such as `int` and `double`; and
- the address-of operator `&` and dereference operator `*`.

## 3. Core Idea

A normal variable owns its stored value.

A pointer stores the address of an object. It can represent “no object” with
`nullptr`, and a non-const pointer can later point to another compatible object.

An lvalue reference is another name for an existing object. It must be
initialized when declared and cannot later be rebound to a different object.

`const` prevents modification through the name, pointer, or reference on which
it appears. It does not necessarily make the underlying object globally
immutable because another non-const access path may still change that object.

## 4. Minimal Syntax

```cpp
double price = 189.10;

double* price_ptr = &price;
double& price_ref = price;
const double& read_only_price = price;
```

Use `*price_ptr` to access the object addressed by a pointer. A reference is
used with the same syntax as the original variable.

## 5. Reading `const` Pointer Declarations

The position of `const` changes what may be modified:

```cpp
double price = 189.10;
double other_price = 189.14;

const double* pointer_to_const = &price;
double* const const_pointer = &price;
const double* const const_pointer_to_const = &price;
```

- `const double*` means a pointer to a read-only `double`. The pointer may be
  redirected, but the value cannot be changed through that pointer.
- `double* const` means a fixed pointer to a mutable `double`. The pointer
  cannot be redirected, but the value may be changed through it.
- `const double* const` means neither the pointer nor the value may be changed
  through that declaration.

For example:

```cpp
pointer_to_const = &other_price;  // Valid.
*const_pointer = 189.12;          // Valid.
```

## 6. How References and Pointers Work

`&price` obtains the address of `price`. A pointer stores that address, and
`*price_ptr` accesses the object at the stored address.

The declaration below binds `price_ref` to `price`:

```cpp
double& price_ref = price;
```

Assigning through `price_ref` changes `price`. A later statement such as
`price_ref = other_price` copies the value of `other_price` into `price`; it
does not rebind the reference.

A `const double&` also refers to the original object, but code using that
reference cannot modify the object through the reference. For large objects,
this commonly avoids a copy while preserving read-only access.

## 7. Lifetime and Validity

Pointers and references do not own the objects they refer to. The referenced
object must remain alive and at a stable address for the entire use.

Production code must check:

- a pointer is not `nullptr` before dereferencing it;
- the pointed-to or referenced object has not been destroyed;
- a container operation has not invalidated an address or reference; and
- an asynchronous callback does not outlive the captured object.

For example, growing a `std::vector` may reallocate its storage and invalidate
pointers and references to its elements. Erasing an element can also invalidate
access paths to that element and later elements.

## 8. Common Mistakes

- Dereferencing `nullptr` causes undefined behavior.
- Reading through an uninitialized pointer may access an invalid address.
- Returning a pointer or reference to a local variable creates a dangling
  access after the function returns.
- Assigning to a reference changes the referred-to object; it does not rebind
  the reference.
- Confusing `const double*` with `double* const` grants or removes the wrong
  mutation capability.
- Keeping a pointer or reference across a container reallocation may leave it
  dangling.

## 9. Trading Use Case

A quote-processing function can receive a quote through a `const` reference,
avoiding a copy and preventing accidental modification. A pointer can represent
an optional selected price level. A non-const reference can update an existing
volume counter directly.

Before retaining any of these access paths, the program must define who owns
the quote and whether order-book updates, container growth, erasure, or thread
handoff can invalidate its address.

## 10. Key Takeaways

- Use `const` to express read-only access through a specific path.
- Use a reference when a valid object must exist.
- Use a pointer when “no object” or reselection is meaningful.
- A pointer or reference does not extend an ordinary object's lifetime.
- Check lifetime and invalidation rules before storing either one.
- Never dereference a pointer before establishing that it is valid.

## 11. Self-Check Questions

1. Why can a pointer be `nullptr` while a valid reference cannot?
2. What changes when assigning through a non-const lvalue reference?
3. What is the difference between `const double*` and `double* const`?
4. Why can growing a `std::vector` invalidate a pointer to one of its elements?
5. When should an API prefer `const T&` over `T*`?

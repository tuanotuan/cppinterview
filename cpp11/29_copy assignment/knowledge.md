# Day 29 — Copy Assignment Operators

## 1. Purpose

A copy assignment operator replaces the state of one existing object with a
copy of another existing object of the same type:

```cpp
second = first;
```

Unlike a copy constructor, both objects already exist before the assignment.
Assignment changes the target's state; it does not create a new object or change
the target's identity.

## 2. Canonical Syntax

```cpp
class Order {
public:
    Order& operator=(const Order& other) {
        id_ = other.id_;
        quantity_ = other.quantity_;
        return *this;
    }

private:
    int id_{};
    int quantity_{};
};
```

The conventional form is:

```cpp
ClassName& operator=(const ClassName& other);
```

- `const ClassName&` avoids a parameter copy and prevents this operator from
  modifying the source through `other`.
- `ClassName&` returns the assigned object and supports chained assignment.
- `return *this` returns the current object by reference.

A by-value parameter is also useful in the copy-and-swap idiom, but `const&` is
the usual starting point.

## 3. Copy Construction vs Copy Assignment

Copy construction creates a new object:

```cpp
Order second{first};
```

Copy assignment updates an object that already exists:

```cpp
Order second{202, 10};
second = first;
```

These are different special member functions and may need different resource
handling.

## 4. Returning `*this` and Chained Assignment

The operator normally returns the current object:

```cpp
return *this;
```

This enables:

```cpp
third = second = first;
```

Assignment operators associate from right to left, so this is parsed as:

```cpp
third = (second = first);
```

The inner assignment returns `second` by reference, which becomes the source for
the outer assignment.

## 5. Self-Assignment and Exception Safety

Self-assignment is legal:

```cpp
order = order;
```

For simple value members, member-wise assignment is already safe. A resource-
owning implementation may use an explicit guard:

```cpp
if (this == &other) {
    return *this;
}
```

The guard alone does not provide exception safety. Code that owns a resource
must not destroy the target's old resource before the replacement has been
acquired successfully. Copy-and-swap is one common way to make self-assignment
safe and, when `swap` does not throw, provide a strong exception guarantee:

```cpp
Buffer& operator=(Buffer other) {
    swap(*this, other);
    return *this;
}
```

## 6. Implicit and Defaulted Copy Assignment

If no copy assignment operator is declared, C++ may implicitly declare one. A
usable implicit operator assigns base-class subobjects and data members
member-wise. This is normally correct for value-like members such as:

- integers and other scalar values;
- `std::string`;
- `std::vector`;
- other classes with correct copy assignment.

The implicit operator can be defined as deleted when a member cannot be copy-
assigned, such as a reference member, a non-static `const` data member, or a
move-only owner such as `std::unique_ptr`. Declaring a move constructor or move
assignment operator also causes the implicitly declared copy assignment operator
to be defined as deleted.

Make the intended member-wise behavior explicit when useful:

```cpp
Order& operator=(const Order&) = default;
```

## 7. Raw-Pointer and Resource Risks

A compiler-generated copy assignment operator copies pointer addresses, not the
pointed-to allocation. For an owning raw pointer, this can:

- leak the target's old allocation;
- make two objects delete the same allocation;
- create dangling pointers;
- introduce unintended shared state.

Classes that own resources must define a correct ownership policy. Prefer RAII
types and standard containers so member-wise assignment is correct.

## 8. Disabling Copying

Disable both copy construction and copy assignment when copying has no valid
meaning:

```cpp
class Connection {
public:
    Connection(const Connection&) = delete;
    Connection& operator=(const Connection&) = delete;
};
```

Unique sockets, mutexes, exchange sessions, and exclusive file handles are
typical examples.

## 9. Trading-System Relevance

Copy assignment may appear when reusing existing objects:

- replacing an order or risk snapshot;
- updating a cached market-data value;
- assigning a strategy configuration;
- replacing a value in a preallocated container.

Large accidental assignments can add allocations and latency. Prefer references
or views when no independent copy is required and their lifetime is guaranteed,
and measure before introducing a more complicated reuse strategy.

## 10. Best Practices

- Prefer the Rule of Zero: compose value-like RAII members and let the compiler
  generate copy assignment.
- Use `= default` when member-wise assignment is intentionally correct.
- Use `= delete` when copying is invalid.
- If a class manually owns a resource, consider the Rule of Three or Rule of
  Five and design copy assignment together with destruction, copy construction,
  and move operations.
- Return `*this` by reference.
- Make self-assignment and exception guarantees explicit in resource-owning
  code.
- Avoid unnecessary copies of large objects in latency-sensitive paths.

## Key Takeaway

A copy assignment operator replaces the state of an existing object. Prefer
compiler-generated member-wise assignment for value-like classes; write a custom
operator only when ownership or another class invariant requires it.

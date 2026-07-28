# Day 28 — Copy Constructors

## 1. Purpose

A copy constructor creates a new object from an existing object of the same type.

It is commonly used when an object is initialized from another object, passed by value, or duplicated by a container.

## 2. Minimal Syntax

class Order {
public:
    Order(const Order& other)
        : id_(other.id_),
          quantity_(other.quantity_) {}
};

General form:

ClassName(const ClassName& other);

const& avoids copying the argument again and allows copying from const objects.

## 3. Default Copy Behavior

If no copy constructor is declared, C++ usually generates one.

The generated version performs a member-wise copy. This is normally safe for members such as:

Integers

std::string

std::vector

Other value-like types

## 4. Shallow Copy Risk

Raw pointers are copied as addresses.

If two objects own the same pointer, this may cause:

Double deletion

Dangling pointers

Shared unintended state

Memory corruption

Prefer standard containers and smart pointers instead of owning raw pointers.

## 5. Disable Copying

Copying may be invalid for unique resources:

class Connection {
public:
    Connection(const Connection&) = delete;
    Connection& operator=(const Connection&) = delete;
};

Examples include sockets, mutexes, exchange sessions, and unique file handles.

## 6. Copy Constructor vs Copy Assignment

Copy construction creates a new object:

Order second{first};

Copy assignment changes an existing object:

second = first;

These are different operations.

## 7. Trading-System Relevance

Copy constructors matter for orders, market-data messages, risk snapshots, and execution reports.

Unnecessary copies may increase latency. Pass read-only objects by const& when no copy is needed:

void process(const Order& order);

## 8. Common Failure Modes

Declaring the parameter by value and causing recursive copying.

Shallow-copying owned raw pointers.

Accidentally copying large objects.

Forgetting related copy, move, or destructor behavior.

## 9. Best Practices

Prefer compiler-generated copying when member-wise copy is correct.

Use = default to make intended copying explicit.

Use = delete when copying is invalid.

Avoid owning raw pointers.

Pass large read-only objects by const&.

## Key Takeaway

A copy constructor creates a new object from an existing object of the same class.

// Real-World C++ Interviews Q159: What is object slicing in C++? How can you avoid it?
// Key: Object slicing occurs when a derived object is copied into a base object by value, so
// the new object contains only the base subobject and loses derived state and behavior. Avoid
// it by passing and storing polymorphic objects through references or owning smart pointers,
// and give a polymorphic base a virtual destructor. When true value semantics are required, use
// a virtual `clone`, type erasure, or a closed sum type such as `std::variant` instead of
// accidental base-value copies.
#include <iostream>

struct Base {
    virtual ~Base() = default;
    virtual const char* name() const { return "Base"; }
};

struct Derived final : Base {
    const char* name() const override { return "Derived"; }
};

void print(const Base& value) {
    std::cout << value.name() << std::endl;
}

int main() {
    const Derived derived;
    const Base sliced = derived;
    print(sliced);
    print(derived);
}

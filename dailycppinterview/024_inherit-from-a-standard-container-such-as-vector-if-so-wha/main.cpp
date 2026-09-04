// Real-World C++ Interviews Q024: Can we inherit from a standard container (such as
// std::vector)? If so what are the implications?
// Key: The language permits deriving from a standard container, but it is usually unsafe as a
// public polymorphic design: containers have no virtual destructor and were not designed as
// base classes. Prefer composition and expose only the operations your abstraction promises.
#include <iostream>

struct Base {
    virtual ~Base() = default;
    virtual int value() const { return 1; }
};

struct Derived final : Base {
    int value() const override { return 24; }
};

int main() {
    Derived derived;
    const Base& base = derived;
    std::cout << base.value() << '\n';
}

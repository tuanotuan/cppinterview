// Daily C++ Interview Q016: Explain the concept of covariant return types and show a use-case
// where it comes in handy!
// Key: An overriding virtual function may return a pointer or reference to a more-derived class
// than the base function returns. This covariant return lets callers with derived static type
// receive the narrower result while base callers retain the base interface.
#include <iostream>

struct Base {
    virtual ~Base() = default;
    virtual int value() const { return 1; }
};

struct Derived final : Base {
    int value() const override { return 16; }
};

int main() {
    Derived derived;
    const Base& base = derived;
    std::cout << base.value() << '\n';
}

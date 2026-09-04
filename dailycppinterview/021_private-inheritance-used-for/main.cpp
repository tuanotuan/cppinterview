// Daily C++ Interview Q021: What is private inheritance used for?
// Key: Private inheritance models an implementation relationship and can provide controlled
// access to protected members or enable empty-base optimization. Prefer composition unless
// inheritance is specifically needed for those mechanics.
#include <iostream>

struct Base {
    virtual ~Base() = default;
    virtual int value() const { return 1; }
};

struct Derived final : Base {
    int value() const override { return 21; }
};

int main() {
    Derived derived;
    const Base& base = derived;
    std::cout << base.value() << '\n';
}

// Real-World C++ Interviews Q014: What is a virtual function?
// Key: A virtual function enables dynamic dispatch: a call through a base pointer or reference
// selects the final overrider for the object's dynamic type. Calls on objects by value can
// still be affected by slicing.
#include <iostream>

struct Base {
    virtual ~Base() = default;
    virtual int value() const { return 1; }
};

struct Derived final : Base {
    int value() const override { return 14; }
};

int main() {
    Derived derived;
    const Base& base = derived;
    std::cout << base.value() << '\n';
}

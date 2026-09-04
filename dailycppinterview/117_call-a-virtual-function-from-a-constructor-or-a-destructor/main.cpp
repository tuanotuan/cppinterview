// Real-World C++ Interviews Q117: Can you call a virtual function from a constructor or a
// destructor?
// Key: A virtual call inside construction or destruction dispatches only within the class whose
// constructor or destructor is active. More-derived overrides are not selected because those
// subobjects are not yet, or are no longer, alive.
#include <iostream>

struct Base {
    Base() { identify(); }
    virtual ~Base() { identify(); }
    virtual void identify() const { std::cout << "Base\n"; }
};

struct Derived : Base {
    void identify() const override { std::cout << "Derived\n"; }
};

int main() {
    Derived value;
    value.identify();
}

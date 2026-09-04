// Real-World C++ Interviews Q022: Can you call a virtual function from a constructor or a
// destructor?
// Key: A virtual call is legal in a constructor or destructor, but dispatch stops at the class
// currently being constructed or destroyed. More-derived parts are not active, and calling a
// pure virtual function in that situation is invalid.
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

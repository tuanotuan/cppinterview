// Real-World C++ Interviews Q080: What is the difference between function overloading and
// function overriding?
// Key: Overloading is compile-time selection among same-named functions with different
// parameters. Overriding replaces virtual behavior in a derived class through a matching
// signature and runtime dynamic dispatch.
#include <iostream>

void choose(int) { std::cout << "overload int\n"; }
void choose(double) { std::cout << "overload double\n"; }

struct Base {
    virtual ~Base() = default;
    virtual void run() const { std::cout << "base\n"; }
};

struct Derived : Base {
    void run() const override { std::cout << "derived override\n"; }
};

int main() {
    choose(1);
    Derived derived;
    static_cast<const Base&>(derived).run();
}

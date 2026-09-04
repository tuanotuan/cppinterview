// Real-World C++ Interviews Q013: What is the difference between function overloading and
// function overriding?
// Key: Overloading selects among functions with the same name but different parameter lists,
// normally at compile time. Overriding supplies a derived implementation for a virtual base
// function with a matching signature and participates in runtime dispatch.
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

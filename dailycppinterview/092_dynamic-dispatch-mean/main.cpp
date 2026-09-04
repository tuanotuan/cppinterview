// Daily C++ Interview Q092: What does dynamic dispatch mean?
// Key: Dynamic dispatch is runtime selection of the final overrider for a virtual call based on
// the object's dynamic type. It requires using the object polymorphically through a pointer or
// reference rather than slicing it by value.
#include <iostream>

struct Base {
    virtual ~Base() = default;
    virtual const char* name() const { return "Base"; }
};

struct Derived : Base {
    const char* name() const override { return "Derived"; }
};

int main() {
    Derived object;
    const Base& view = object;
    std::cout << view.name() << '\n';
}

// Daily C++ Interview Q119: Can virtual functions have default arguments?
// Key: Yes, a virtual function may declare default arguments, but the default is bound
// statically while the function body dispatches dynamically. A call through a base can
// therefore execute a derived override with the base declaration's default value, so this
// combination is best avoided.
#include <iostream>

struct Base {
    virtual ~Base() = default;
    virtual void show(int value = 1) const { std::cout << "Base " << value << '\n'; }
};

struct Derived : Base {
    void show(int value = 2) const override { std::cout << "Derived " << value << '\n'; }
};

int main() {
    Derived object;
    const Base& base = object;
    base.show();
}

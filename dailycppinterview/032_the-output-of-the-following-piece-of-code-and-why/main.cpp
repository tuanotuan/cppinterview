// Daily C++ Interview Q032: What is the output of the following piece of code and why?
// Key: The output is `1`. The non-const object selects the non-const overload; making the
// destination variable const does not retroactively select the const member function.
#include <iostream>

class A {
public:
    int value() { return 1; }
    int value() const { return 2; }
};

int main() {
    A a;
    const auto b = a.value();
    std::cout << b << '\n';
}

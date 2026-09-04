// Daily C++ Interview Q028: What is the output of the following piece of code and why?
// Key: The output is `1`. Overload resolution uses the cv-qualification of object `a`, which is
// non-const, so it calls the non-const member; the `const` on result variable `b` does not
// affect that earlier call.
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

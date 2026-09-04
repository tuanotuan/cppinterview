// Daily C++ Interview Q131: What are Default Member Initializers in C++?
// Key: A default member initializer supplies an initial value when a constructor does not
// explicitly initialize that member. Constructors still initialize members in declaration
// order, and a member initializer in the constructor overrides the default for that
// construction.
#include <iostream>

struct Value {
    int number = 42;
    Value() = default;
    explicit Value(int input) : number(input) {}
};

int main() {
    std::cout << Value{}.number << ' ' << Value{7}.number << '\n';
}

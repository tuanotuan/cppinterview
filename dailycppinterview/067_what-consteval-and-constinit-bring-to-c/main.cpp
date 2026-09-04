// Daily C++ Interview Q067: Explain what consteval and constinit bring to C++?
// Key: `consteval` makes a function immediate so evaluated calls must be constant expressions.
// `constinit` guarantees static initialization for a static- or thread-storage object but does
// not add constness.
#include <iostream>

consteval int square(int value) {
    return value * value;
}

constinit int runtime_mutable = square(3);

int main() {
    ++runtime_mutable;
    std::cout << runtime_mutable << '\n';
}

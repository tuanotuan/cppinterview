// Real-World C++ Interviews Q041: Explain what consteval and constinit bring to C++?
// Key: `consteval` declares an immediate function whose potentially evaluated calls must
// produce a compile-time constant. `constinit` applies to static or thread storage and requires
// static initialization, but it does not make the object immutable.
#include <iostream>

consteval int square(int value) {
    return value * value;
}

constinit int runtime_mutable = square(3);

int main() {
    ++runtime_mutable;
    std::cout << runtime_mutable << '\n';
}

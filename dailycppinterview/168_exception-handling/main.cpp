// Real-World C++ Interviews Q168: How is exception handling implemented in C++?
// Key: `throw` initializes an exception object and transfers control to a matching handler in
// an enclosing `try`/`catch` sequence. During stack unwinding, fully constructed automatic
// objects are destroyed in reverse order, which is why RAII is central to exception safety.
// Catch polymorphic exceptions by `const` reference and order specific handlers before general
// ones; destructors should not let exceptions escape during unwinding.
#include <iostream>
#include <stdexcept>

int divide(int numerator, int denominator) {
    if (denominator == 0) throw std::invalid_argument{"division by zero"};
    return numerator / denominator;
}

int main() {
    try {
        std::cout << divide(8, 0) << std::endl;
    } catch (const std::exception& error) {
        std::cout << error.what() << std::endl;
    }
}

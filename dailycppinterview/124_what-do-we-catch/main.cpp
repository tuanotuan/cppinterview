// Daily C++ Interview Q124: What do we catch?
// Key: Catch exceptions by `const` reference to the appropriate base when handling a hierarchy,
// and order specific handlers before general ones. Catching by value can copy and slice; catch
// by non-const reference only when mutation is an intentional protocol.
#include <iostream>
#include <stdexcept>

int main() {
    try {
        throw std::runtime_error("failure");
    } catch (const std::exception& error) {
        std::cout << error.what() << '\n';
    }
}

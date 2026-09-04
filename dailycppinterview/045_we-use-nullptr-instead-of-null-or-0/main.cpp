// Daily C++ Interview Q045: Why should we use nullptr instead of NULL or 0?
// Key: `nullptr` has type `std::nullptr_t` and converts only to pointer-like targets, so it
// avoids the integer overload ambiguities of `0` and implementation-defined macro forms of
// `NULL`. It communicates a null pointer directly.
#include <cstddef>
#include <iostream>

void choose(int) { std::cout << "integer\n"; }
void choose(const int*) { std::cout << "pointer\n"; }

int main() {
    choose(nullptr);
}

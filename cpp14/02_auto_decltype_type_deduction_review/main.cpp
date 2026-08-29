#include <iostream>

int main() {
    const int base = 7;
    auto copy = base;              // int: top-level const is dropped
    decltype(base) exact = base;   // const int

    int value = 10;
    int& ref = value;
    decltype(ref) alias = value;   // int&

    copy = 8;
    alias = 42;
    std::cout << "copy: " << copy << "\n";
    std::cout << "exact: " << exact << "\n";
    std::cout << "value: " << value << "\n";
}

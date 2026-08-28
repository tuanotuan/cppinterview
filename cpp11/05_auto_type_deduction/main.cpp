#include <iostream>

int main() {
    const int source = 10;

    auto copy = source;   // int: top-level const is dropped
    auto& alias = source; // const int&: this is not a copy
    auto price = 2.5;     // double

    copy = 20;

    std::cout << "source=" << source << '\n';
    std::cout << "copy=" << copy << '\n';
    std::cout << "alias=" << alias << '\n';
    std::cout << "price=" << price << '\n';
}

// Day 16: constinit and Static Initialization
#include <iostream>

constinit int counter = 7; // Constant-initialized, but still mutable.

int main() {
    ++counter;
    std::cout << "counter = " << counter << '\n';
}

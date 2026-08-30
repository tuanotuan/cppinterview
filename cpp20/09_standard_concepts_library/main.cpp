// Day 9: The Standard Concepts Library
#include <concepts>
#include <iostream>

void show(std::integral auto value) {
    std::cout << value << " is integral\n";
}

void show(std::floating_point auto value) {
    std::cout << value << " is floating-point\n";
}

int main() {
    show(42u);
    show(2.5);
}

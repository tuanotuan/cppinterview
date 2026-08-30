// Day 10: Constrained Templates and Abbreviated Function Templates
#include <concepts>
#include <iostream>

template<std::integral T>
T square(T value) {
    return value * value;
}

std::integral auto increment(std::integral auto value) {
    return value + 1;
}

int main() {
    std::cout << "square = " << square(5) << '\n';
    std::cout << "increment = " << increment(5) << '\n';
}

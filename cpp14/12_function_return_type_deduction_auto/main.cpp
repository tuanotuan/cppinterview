#include <iostream>

auto square(int value) {
    return value * value; // deduced as int
}

auto half(double value) {
    return value / 2.0; // deduced as double
}

int main() {
    std::cout << "square: " << square(6) << "\n";
    std::cout << "half: " << half(9.0) << "\n";
}

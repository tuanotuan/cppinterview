#include <iostream>
#include <stdexcept>

int divide(int numerator, int denominator) {
    if (denominator == 0) {
        throw std::invalid_argument("denominator is zero");
    }
    return numerator / denominator;
}

void reset(int& state) noexcept {
    state = 0;
}

int main() {
    int state = 7;
    try {
        std::cout << divide(10, 0) << "\n";
    } catch (const std::invalid_argument& error) {
        std::cout << "caught: " << error.what() << "\n";
    }
    reset(state);
    std::cout << "state: " << state << "\n";
}

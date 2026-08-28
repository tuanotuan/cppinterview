#include <iostream>
#include <stdexcept>

double divide(double numerator, double denominator) {
    if (denominator == 0.0) {
        throw std::invalid_argument("zero denominator");
    }
    return numerator / denominator;
}

void cleanup() noexcept {
    std::cout << "cleanup\n";
}

int main() {
    try {
        std::cout << divide(8.0, 2.0) << '\n';
        std::cout << divide(1.0, 0.0) << '\n';
    } catch (const std::exception& error) {
        std::cout << "caught=" << error.what() << '\n';
    }
    cleanup();
}

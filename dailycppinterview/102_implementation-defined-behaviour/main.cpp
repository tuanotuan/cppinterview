// Real-World C++ Interviews Q102: What is implementation-defined behaviour?
// Key: Implementation-defined behavior lets each implementation choose an allowed behavior but
// requires that choice to be documented, such as sizes or mappings for certain types. Portable
// code either avoids depending on it or validates the documented target.
#include <iostream>
#include <optional>

std::optional<int> checked_divide(int numerator, int denominator) {
    if (denominator == 0) return std::nullopt;
    return numerator / denominator;
}

int main() {
    const auto result = checked_divide(102, 2);
    if (result) std::cout << *result << '\n';
}

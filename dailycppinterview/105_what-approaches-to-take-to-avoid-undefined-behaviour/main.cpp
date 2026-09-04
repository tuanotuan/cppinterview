// Real-World C++ Interviews Q105: What approaches to take to avoid undefined behaviour?
// Key: Avoid undefined behavior by designing explicit invariants and ownership, validating
// inputs and library preconditions, enabling strong warnings, and running sanitizers and tests.
// Prefer RAII, bounded abstractions, and small scopes so invalid states are harder to express.
#include <iostream>
#include <optional>

std::optional<int> checked_divide(int numerator, int denominator) {
    if (denominator == 0) return std::nullopt;
    return numerator / denominator;
}

int main() {
    const auto result = checked_divide(105, 2);
    if (result) std::cout << *result << '\n';
}

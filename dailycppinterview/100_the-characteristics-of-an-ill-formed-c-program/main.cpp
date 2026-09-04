// Daily C++ Interview Q100: What are the characteristics of an ill-formed C++ program?
// Key: An ill-formed program violates a syntax rule, semantic constraint, or diagnosable
// requirement of C++. A conforming implementation must issue at least one diagnostic for
// diagnosable violations, while ill-formed-no-diagnostic-required cases need not be detected.
#include <iostream>
#include <optional>

std::optional<int> checked_divide(int numerator, int denominator) {
    if (denominator == 0) return std::nullopt;
    return numerator / denominator;
}

int main() {
    const auto result = checked_divide(100, 2);
    if (result) std::cout << *result << '\n';
}

// Daily C++ Interview Q104: What are the reasons behind undefined behaviour’s existence?
// Key: Undefined behavior preserves room for efficient low-level implementations, avoids
// mandatory checks and semantics that would penalize valid programs, and accommodates diverse
// hardware. That freedom is useful only when programs uphold the language and library
// preconditions.
#include <iostream>
#include <optional>

std::optional<int> checked_divide(int numerator, int denominator) {
    if (denominator == 0) return std::nullopt;
    return numerator / denominator;
}

int main() {
    const auto result = checked_divide(104, 2);
    if (result) std::cout << *result << '\n';
}

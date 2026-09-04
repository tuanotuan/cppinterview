// Real-World C++ Interviews Q103: What is undefined behaviour in C++?
// Key: Undefined behavior occurs when the standard imposes no requirements after a violated
// rule or precondition. The optimizer may assume it never happens, so one observed run cannot
// establish a stable result.
#include <iostream>
#include <optional>

std::optional<int> checked_divide(int numerator, int denominator) {
    if (denominator == 0) return std::nullopt;
    return numerator / denominator;
}

int main() {
    const auto result = checked_divide(103, 2);
    if (result) std::cout << *result << '\n';
}

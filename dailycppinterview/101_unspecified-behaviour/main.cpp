// Daily C++ Interview Q101: What is unspecified behaviour?
// Key: Unspecified behavior means the standard permits one of several valid outcomes and the
// implementation need not document which occurs on a particular evaluation. A program must be
// correct for every permitted choice.
#include <iostream>
#include <optional>

std::optional<int> checked_divide(int numerator, int denominator) {
    if (denominator == 0) return std::nullopt;
    return numerator / denominator;
}

int main() {
    const auto result = checked_divide(101, 2);
    if (result) std::cout << *result << '\n';
}

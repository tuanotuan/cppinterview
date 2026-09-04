// Daily C++ Interview Q099: What is observable behaviour of code?
// Key: Observable behavior is the part of execution the abstract machine requires an
// implementation to preserve, such as specified I/O effects and accesses to volatile objects
// under the applicable rules. The as-if rule permits any optimization that leaves required
// observations unchanged.
#include <iostream>
#include <optional>

std::optional<int> checked_divide(int numerator, int denominator) {
    if (denominator == 0) return std::nullopt;
    return numerator / denominator;
}

int main() {
    const auto result = checked_divide(99, 2);
    if (result) std::cout << *result << '\n';
}

// Real-World C++ Interviews Q064: What are concepts in C++?
// Key: A concept is a named compile-time predicate used to constrain template arguments. It
// makes requirements part of the interface, participates in overload ordering, and usually
// produces diagnostics closer to the violated requirement.
#include <concepts>
#include <iostream>

auto add(std::integral auto left, std::integral auto right) {
    return left + right;
}

int main() {
    std::cout << add(20, 22) << '\n';
}

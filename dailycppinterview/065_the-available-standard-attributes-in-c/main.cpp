// Real-World C++ Interviews Q065: What are the available standard attributes in C++?
// Key: Standard attributes use `[[...]]` syntax. Across C++11–20 the main ones include
// `noreturn`, `carries_dependency`, `deprecated`, `fallthrough`, `nodiscard`, `maybe_unused`,
// `likely`, `unlikely`, and `no_unique_address`; support and placement rules depend on the
// chosen standard.
#include <concepts>
#include <iostream>

template<class T>
concept Number = std::integral<T> || std::floating_point<T>;

auto twice(Number auto value) {
    return value + value;
}

int main() {
    std::cout << twice(65) << '\n';
}

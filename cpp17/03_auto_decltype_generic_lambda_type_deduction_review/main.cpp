#include <iostream>
#include <type_traits>

int main() {
    const int value = 7;
    auto copy = value;
    const auto& alias = value;
    decltype(value) exact = value;

    static_assert(std::is_same_v<decltype(copy), int>);
    static_assert(std::is_same_v<decltype(alias), const int&>);
    static_assert(std::is_same_v<decltype(exact), const int>);

    const auto twice = [](auto x) { return x + x; };
    std::cout << "twice int: " << twice(5) << '\n';
    std::cout << "twice double: " << twice(2.5) << '\n';
}

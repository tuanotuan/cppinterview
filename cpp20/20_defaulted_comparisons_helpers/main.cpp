// Day 20: Defaulted Comparisons and Comparison Helpers
#include <compare>
#include <iostream>

struct Point {
    int x{};
    int y{};

    bool operator==(const Point&) const = default;
    auto operator<=>(const Point&) const = default;
};

int main() {
    Point a{1, 8};
    Point b{1, 9};
    auto order = a <=> b;

    std::cout << std::boolalpha;
    std::cout << "equal = " << (a == b) << '\n';
    std::cout << "less = " << std::is_lt(order) << '\n';
}

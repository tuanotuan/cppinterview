// Day 19: Three-Way Comparison and Comparison Categories
#include <compare>
#include <iostream>
#include <type_traits>

struct Measurement {
    double value{};
    auto operator<=>(const Measurement&) const = default;
};

int main() {
    Measurement first{2.5};
    Measurement second{3.0};
    using Order = decltype(first <=> second);

    static_assert(std::is_same_v<Order, std::partial_ordering>);
    std::cout << std::boolalpha << (first < second) << '\n';
}

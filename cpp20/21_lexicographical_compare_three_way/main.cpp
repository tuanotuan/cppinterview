// Day 21: lexicographical_compare_three_way
#include <algorithm>
#include <array>
#include <compare>
#include <iostream>

int main() {
    std::array first{1, 2, 3};
    std::array second{1, 2, 4};

    auto order = std::lexicographical_compare_three_way(
        first.begin(), first.end(), second.begin(), second.end());

    std::cout << std::boolalpha;
    std::cout << "first is less = " << std::is_lt(order) << '\n';
}

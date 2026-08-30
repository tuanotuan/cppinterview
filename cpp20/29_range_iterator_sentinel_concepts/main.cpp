// Day 29: Range, Iterator, and Sentinel Concepts
#include <concepts>
#include <iostream>
#include <iterator>
#include <ranges>
#include <vector>

int main() {
    using Range = std::vector<int>;
    using Iterator = std::ranges::iterator_t<Range>;
    using Sentinel = std::ranges::sentinel_t<Range>;

    static_assert(std::ranges::range<Range>);
    static_assert(std::input_iterator<Iterator>);
    static_assert(std::sentinel_for<Sentinel, Iterator>);

    std::cout << "range concepts satisfied\n";
}

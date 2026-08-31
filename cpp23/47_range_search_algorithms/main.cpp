#include <algorithm>
#include <array>
#include <iostream>
#include <ranges>
#include <version>

int main() {
#if defined(__cpp_lib_ranges_contains) && \
    defined(__cpp_lib_ranges_starts_ends_with) && \
    defined(__cpp_lib_ranges_find_last)
    std::array values{1, 2, 3, 2, 4};
    std::array middle{2, 3};
    std::array prefix{1, 2};
    std::array suffix{2, 4};

    std::cout << std::boolalpha
              << std::ranges::contains(values, 3) << ' '
              << std::ranges::contains_subrange(values, middle) << ' '
              << std::ranges::starts_with(values, prefix) << ' '
              << std::ranges::ends_with(values, suffix) << '\n';

    auto last = std::ranges::find_last(values, 2);
    std::cout << "last index="
              << std::ranges::distance(values.begin(), last.begin()) << '\n';
#else
    std::cout << "C++23 range search algorithms unavailable\n";
#endif
}

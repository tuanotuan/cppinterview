#include <algorithm>
#include <array>
#include <functional>
#include <iostream>
#include <numeric>
#include <ranges>
#include <version>

int main() {
#if defined(__cpp_lib_ranges_fold) && defined(__cpp_lib_ranges_iota)
    std::array<int, 4> values{};
    std::ranges::iota(values, 1);
    int sum = std::ranges::fold_left(values, 0, std::plus<>{});

    auto logical_end = std::shift_left(values.begin(), values.end(), 1);
    std::cout << "sum=" << sum << " shifted: ";
    for (auto it = values.begin(); it != logical_end; ++it)
        std::cout << *it << ' ';
    std::cout << '\n';
#else
    std::cout << "C++23 fold or ranges::iota unavailable\n";
#endif
}

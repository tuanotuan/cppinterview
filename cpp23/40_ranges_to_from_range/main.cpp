#include <iostream>
#include <ranges>
#include <vector>
#include <version>

int main() {
#if defined(__cpp_lib_ranges_to_container) && \
    defined(__cpp_lib_containers_ranges)
    auto squares = std::views::iota(1, 5)
                 | std::views::transform([](int n) { return n * n; });

    auto values = std::ranges::to<std::vector<int>>(squares);
    std::vector<int> copy(std::from_range, values);

    for (int value : copy)
        std::cout << value << ' ';
    std::cout << '\n';
#else
    std::cout << "ranges::to or from_range unavailable\n";
#endif
}

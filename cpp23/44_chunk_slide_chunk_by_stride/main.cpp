#include <array>
#include <iostream>
#include <ranges>
#include <version>

int main() {
#if defined(__cpp_lib_ranges_chunk) && defined(__cpp_lib_ranges_slide) && \
    defined(__cpp_lib_ranges_chunk_by) && defined(__cpp_lib_ranges_stride)
    std::array values{1, 3, 2, 4, 5, 7};

    for (auto group : values | std::views::chunk(2))
        std::cout << '[' << *group.begin() << "] ";
    std::cout << '\n';

    for (auto window : values | std::views::slide(3))
        std::cout << *window.begin() << ' ';
    std::cout << '\n';

    auto same_parity = [](int a, int b) { return a % 2 == b % 2; };
    for (auto run : values | std::views::chunk_by(same_parity))
        std::cout << *run.begin() << ' ';
    std::cout << '\n';

    for (int value : values | std::views::stride(2))
        std::cout << value << ' ';
    std::cout << '\n';
#else
    std::cout << "C++23 grouping views unavailable\n";
#endif
}

#include <array>
#include <functional>
#include <iostream>
#include <ranges>
#include <version>

int main() {
#if defined(__cpp_lib_ranges_zip)
    std::array values{2, 5, 9, 10};

    for (auto [first, second] : values | std::views::pairwise)
        std::cout << '(' << first << ',' << second << ") ";
    std::cout << '\n';

    for (int difference :
         std::views::adjacent_transform<2>(values, std::minus<>{}))
        std::cout << difference << ' ';
    std::cout << '\n';
#else
    std::cout << "adjacent and pairwise views unavailable\n";
#endif
}

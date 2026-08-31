#include <array>
#include <iostream>
#include <ranges>
#include <string_view>
#include <version>

int main() {
#if defined(__cpp_lib_ranges_join_with) && defined(__cpp_lib_ranges_repeat) && \
    defined(__cpp_lib_ranges_cartesian_product)
    std::array words{std::string_view{"C"}, std::string_view{"23"}};
    for (char ch : std::views::join_with(words, std::string_view{"-"}))
        std::cout << ch;
    std::cout << '\n';

    for (int value : std::views::repeat(7, 3))
        std::cout << value << ' ';
    std::cout << '\n';

    std::array numbers{1, 2};
    std::array letters{'a', 'b'};
    for (auto [number, letter] :
         std::views::cartesian_product(numbers, letters))
        std::cout << number << letter << ' ';
    std::cout << '\n';
#else
    std::cout << "join_with, repeat, or cartesian_product unavailable\n";
#endif
}

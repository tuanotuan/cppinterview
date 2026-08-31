#include <array>
#include <functional>
#include <iostream>
#include <ranges>
#include <string_view>
#include <version>

int main() {
#if defined(__cpp_lib_ranges_zip) && defined(__cpp_lib_ranges_enumerate)
    std::array names{std::string_view{"A"}, std::string_view{"B"}};
    std::array scores{7, 9};
    for (auto [name, score] : std::views::zip(names, scores))
        std::cout << name << ':' << score << ' ';
    std::cout << '\n';

    std::array left{1, 2};
    std::array right{10, 20};
    for (int sum : std::views::zip_transform(std::plus<>{}, left, right))
        std::cout << sum << ' ';
    std::cout << '\n';

    for (auto [index, name] : std::views::enumerate(names))
        std::cout << index << '=' << name << ' ';
    std::cout << '\n';
#else
    std::cout << "zip or enumerate views unavailable\n";
#endif
}

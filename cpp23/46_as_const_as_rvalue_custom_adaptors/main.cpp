#include <iostream>
#include <ranges>
#include <type_traits>
#include <utility>
#include <vector>
#include <version>

#if defined(__cpp_lib_ranges_as_const) && defined(__cpp_lib_ranges_as_rvalue)
struct FirstTwo : std::ranges::range_adaptor_closure<FirstTwo> {
    template <std::ranges::viewable_range R>
    constexpr auto operator()(R&& range) const {
        return std::forward<R>(range) | std::views::take(2);
    }
};
#endif

int main() {
#if defined(__cpp_lib_ranges_as_const) && defined(__cpp_lib_ranges_as_rvalue)
    std::vector values{1, 2, 3};
    auto read_only = values | std::views::as_const;
    static_assert(std::is_same_v<
        std::ranges::range_reference_t<decltype(read_only)>, const int&>);

    auto movable = values | std::views::as_rvalue;
    static_assert(std::is_rvalue_reference_v<
        std::ranges::range_reference_t<decltype(movable)>>);

    for (int value : values | FirstTwo{})
        std::cout << value << ' ';
    std::cout << '\n';
#else
    std::cout << "as_const or as_rvalue views unavailable\n";
#endif
}

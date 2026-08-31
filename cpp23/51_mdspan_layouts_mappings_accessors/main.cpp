#include <array>
#include <cstddef>
#include <iostream>
#include <version>

#if __has_include(<mdspan>)
#include <mdspan>
#endif

#if defined(__cpp_lib_mdspan)
struct DoubleAccessor {
    using offset_policy = DoubleAccessor;
    using element_type = const int;
    using reference = int;
    using data_handle_type = const int*;

    constexpr reference access(data_handle_type data,
                               std::size_t index) const noexcept {
        return data[index] * 2;
    }

    constexpr data_handle_type offset(data_handle_type data,
                                      std::size_t index) const noexcept {
        return data + index;
    }
};
#endif

int main() {
#if defined(__cpp_lib_mdspan)
    using Shape = std::extents<std::size_t, 2, 3>;
    using Left = std::layout_left::mapping<Shape>;
    using Right = std::layout_right::mapping<Shape>;
    using View = std::mdspan<const int, Shape,
                             std::layout_left, DoubleAccessor>;

    std::array data{1, 2, 3, 4, 5, 6};
    View view(data.data(), Left{}, DoubleAccessor{});
    std::cout << "left offset=" << Left{}(1, 0)
              << " right offset=" << Right{}(1, 0)
              << " value=" << view[1, 2] << '\n';
#else
    std::cout << "mdspan policies unavailable\n";
#endif
}

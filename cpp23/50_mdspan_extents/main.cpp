#include <array>
#include <iostream>
#include <version>

#if __has_include(<mdspan>)
#include <mdspan>
#endif

int main() {
#if defined(__cpp_lib_mdspan)
    std::array data{1, 2, 3, 4, 5, 6};
    std::mdspan matrix(data.data(), 2, 3);

    static_assert(decltype(matrix)::rank() == 2);
    std::cout << "rows=" << matrix.extent(0)
              << " columns=" << matrix.extent(1)
              << " value=" << matrix[1, 2] << '\n';
#else
    std::cout << "mdspan unavailable\n";
#endif
}

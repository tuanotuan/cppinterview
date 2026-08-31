#include <cstddef>
#include <iostream>
#include <type_traits>

#if __has_include(<stdfloat>)
#include <stdfloat>
#endif

int main() {
    auto count = 10uz;
    auto offset = -1z;

    static_assert(std::is_same_v<decltype(count), std::size_t>);
    static_assert(std::is_same_v<decltype(offset),
                                 std::make_signed_t<std::size_t>>);
    std::cout << "count=" << count << " offset=" << offset << '\n';

#if defined(__STDCPP_FLOAT32_T__)
    std::float32_t value = static_cast<std::float32_t>(1.5);
    std::cout << "float32 bytes=" << sizeof(value) << '\n';
#else
    std::cout << "float32 type unavailable\n";
#endif
}

#include <iostream>

#if defined(__cpp_constexpr) && __cpp_constexpr >= 202211L
constexpr int cached_value() {
    // Static constexpr locals became usable here in C++23.
    static constexpr int value = 7;
    return value;
}
#endif

int main() {
#if defined(__cpp_constexpr) && __cpp_constexpr >= 202211L
    constexpr int value = cached_value();
    static_assert(value == 7);
    std::cout << "value=" << value << '\n';
#else
    std::cout << "C++23 constexpr extension unavailable\n";
#endif
}

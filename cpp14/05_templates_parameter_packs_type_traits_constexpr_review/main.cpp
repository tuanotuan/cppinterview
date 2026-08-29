#include <iostream>
#include <type_traits>

template <class T>
constexpr T sum(T value) {
    return value;
}

template <class T, class... Rest>
constexpr typename std::common_type<T, Rest...>::type
sum(T first, Rest... rest) {
    return first + sum(rest...);
}

int main() {
    constexpr auto total = sum(1, 2, 3, 4);
    static_assert(std::is_integral<decltype(total)>::value, "integral result");
    static_assert(total == 10, "compile-time sum");
    std::cout << "sum: " << total << "\n";
}

#include <iostream>
#include <type_traits>

template <class T>
constexpr T sum(T value) { return value; }

template <class T, class... Ts>
constexpr auto sum(T first, Ts... rest) {
    static_assert(std::conjunction_v<std::is_arithmetic<T>,
                                    std::is_arithmetic<Ts>...>);
    return first + sum(rest...);
}

int main() {
    constexpr auto compile_time = sum(1, 2, 3, 4);
    static_assert(compile_time == 10);
    std::cout << "compile-time sum: " << compile_time << '\n';
    std::cout << "mixed sum: " << sum(1, 2.5, 4) << '\n';
}

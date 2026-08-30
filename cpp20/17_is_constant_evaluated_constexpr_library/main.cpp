// Day 17: is_constant_evaluated and the constexpr Standard Library
#include <array>
#include <iostream>
#include <type_traits>

constexpr int adjusted(int value) {
    if (std::is_constant_evaluated()) {
        return value + 1;
    }
    return value + 2;
}

int main() {
    constexpr std::array<int, 2> values{adjusted(4), adjusted(9)};
    static_assert(values[0] == 5 && values[1] == 10);

    std::cout << "compile-time value = " << values[0] << '\n';
    std::cout << "runtime value = " << adjusted(4) << '\n';
}

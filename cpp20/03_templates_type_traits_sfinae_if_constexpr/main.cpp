// Day 3: Templates, Type Traits, SFINAE, and if constexpr
#include <iostream>
#include <type_traits>

template<class T, std::enable_if_t<std::is_arithmetic_v<T>, int> = 0>
void describe(T value) {
    if constexpr (std::is_integral_v<T>) {
        std::cout << value << " is integral\n";
    } else {
        std::cout << value << " is floating-point\n";
    }
}

int main() {
    describe(7);
    describe(3.5);
}

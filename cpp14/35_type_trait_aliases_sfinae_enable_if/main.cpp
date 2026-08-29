#include <iostream>
#include <type_traits>

template <class T>
using integral_result_t = std::enable_if_t<std::is_integral<T>::value, T>;

template <class T>
integral_result_t<T> twice(T value) {
    return value + value;
}

int main() {
    std::cout << "int: " << twice(21) << "\n";
    std::cout << "long: " << twice(10L) << "\n";
    // twice(1.5) is excluded by SFINAE.
}

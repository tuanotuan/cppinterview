#include <iostream>
#include <string>
#include <type_traits>

template <class T>
std::string describe(const T& value) {
    if constexpr (std::is_integral_v<T>) {
        return "integer " + std::to_string(value);
    } else if constexpr (std::is_floating_point_v<T>) {
        return "floating " + std::to_string(value);
    } else {
        return "text length " + std::to_string(value.size());
    }
}

int main() {
    std::cout << describe(7) << '\n';
    std::cout << describe(2.5) << '\n';
    std::cout << describe(std::string{"C++17"}) << '\n';
}

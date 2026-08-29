#include <array>
#include <iostream>

int main() {
    constexpr auto square = [](int value) constexpr {
        return value * value;
    };

    static_assert(square(4) == 16);
    std::array<int, square(3)> values{};
    const int runtime_input = 5;

    std::cout << "array size: " << values.size() << '\n';
    std::cout << "runtime square: " << square(runtime_input) << '\n';
}

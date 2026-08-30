// Day 36: bit_cast, Endian, Bit Operations, Math Constants, midpoint, and bind_front
#include <bit>
#include <cstdint>
#include <functional>
#include <iostream>
#include <numeric>
#include <numbers>

int add(int a, int b) {
    return a + b;
}

int main() {
    float value = 1.0F;
    auto bits = std::bit_cast<std::uint32_t>(value);
    auto add_ten = std::bind_front(add, 10);

    std::cout << "bits = " << bits << '\n';
    std::cout << "popcount = " << std::popcount(0b101101u) << '\n';
    std::cout << "little endian = "
              << std::boolalpha << (std::endian::native == std::endian::little) << '\n';
    std::cout << "pi = " << std::numbers::pi << '\n';
    std::cout << "midpoint = " << std::midpoint(2, 10) << '\n';
    std::cout << "bound add = " << add_ten(5) << '\n';
}

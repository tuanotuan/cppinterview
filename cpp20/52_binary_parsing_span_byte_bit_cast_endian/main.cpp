// Day 52: Binary Parsing with span, byte, bit_cast, and Endian
#include <array>
#include <bit>
#include <cstddef>
#include <cstdint>
#include <iomanip>
#include <iostream>
#include <span>

constexpr std::uint32_t swap32(std::uint32_t value) {
    return ((value & 0x000000FFu) << 24)
         | ((value & 0x0000FF00u) << 8)
         | ((value & 0x00FF0000u) >> 8)
         | ((value & 0xFF000000u) >> 24);
}

int main() {
    std::array raw{
        std::byte{0x78}, std::byte{0x56},
        std::byte{0x34}, std::byte{0x12}};
    std::span<const std::byte> packet{raw};

    std::array<std::byte, 4> field{};
    for (std::size_t i = 0; i < field.size(); ++i) field[i] = packet[i];
    std::uint32_t value = std::bit_cast<std::uint32_t>(field);

    if constexpr (std::endian::native == std::endian::big) {
        value = swap32(value);
    } else if constexpr (std::endian::native != std::endian::little) {
        value = std::to_integer<std::uint32_t>(field[0])
              | (std::to_integer<std::uint32_t>(field[1]) << 8)
              | (std::to_integer<std::uint32_t>(field[2]) << 16)
              | (std::to_integer<std::uint32_t>(field[3]) << 24);
    }

    std::cout << "value = 0x" << std::hex << value << '\n';
}

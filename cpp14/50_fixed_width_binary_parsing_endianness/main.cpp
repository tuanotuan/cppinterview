#include <array>
#include <cstdint>
#include <cstring>
#include <iomanip>
#include <iostream>

int main() {
    const std::array<std::uint8_t, 4> bytes{{0x12, 0x34, 0x56, 0x78}};
    const std::uint32_t value =
        (std::uint32_t(bytes[0]) << 24) |
        (std::uint32_t(bytes[1]) << 16) |
        (std::uint32_t(bytes[2]) << 8) |
        std::uint32_t(bytes[3]);

    std::uint16_t marker = 1;
    std::uint8_t first_byte = 0;
    std::memcpy(&first_byte, &marker, sizeof(first_byte));

    std::cout << "parsed: " << std::hex << value << "\n";
    std::cout << "host endian: "
              << (first_byte == 1 ? "little" : "big") << "\n";
}

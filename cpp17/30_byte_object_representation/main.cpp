#include <array>
#include <cstddef>
#include <cstdint>
#include <cstring>
#include <iomanip>
#include <iostream>

int main() {
    const std::uint32_t original = 0x12345678u;
    std::array<std::byte, sizeof(original)> representation{};
    std::memcpy(representation.data(), &original, sizeof original);

    std::uint32_t restored = 0;
    std::memcpy(&restored, representation.data(), sizeof restored);

    const std::byte data{0xAB};
    const std::byte low = data & std::byte{0x0F};
    std::cout << "round trip: " << std::hex << restored << '\n';
    std::cout << std::dec << "low nibble: "
              << std::to_integer<unsigned>(low) << '\n';
}

#include <array>
#include <bit>
#include <cstddef>
#include <cstdint>
#include <cstring>
#include <expected>
#include <iostream>
#include <span>
#include <string_view>

std::expected<std::uint16_t, std::string_view>
parse_code(std::span<const std::byte> bytes) {
    if (bytes.size() < sizeof(std::uint16_t))
        return std::unexpected("too short");

    std::uint16_t value = 0;
    std::memcpy(&value, bytes.data(), sizeof(value));
    if constexpr (std::endian::native == std::endian::little)
        value = std::byteswap(value);
    return value;
}

int main() {
    std::array bytes{std::byte{0x12}, std::byte{0x34}};
    auto result = parse_code(bytes);
    if (result)
        std::cout << "code=" << *result << '\n';
    else
        std::cout << "error=" << result.error() << '\n';
}

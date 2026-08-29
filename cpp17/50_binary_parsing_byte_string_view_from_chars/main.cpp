#include <array>
#include <charconv>
#include <cstddef>
#include <cstdint>
#include <iomanip>
#include <iostream>
#include <string_view>
#include <system_error>

bool parse_bytes(std::string_view text,
                 std::array<std::byte, 4>& output) {
    std::size_t position = 0;
    for (std::byte& byte : output) {
        while (position < text.size() && text[position] == ' ') ++position;
        const std::size_t start = position;
        while (position < text.size() && text[position] != ' ') ++position;
        unsigned value = 0;
        const auto result = std::from_chars(
            text.data() + start, text.data() + position, value, 16);
        if (start == position || result.ec != std::errc{} ||
            result.ptr != text.data() + position || value > 0xFFu) {
            return false;
        }
        byte = static_cast<std::byte>(value);
    }
    while (position < text.size() && text[position] == ' ') ++position;
    return position == text.size();
}

int main() {
    std::array<std::byte, 4> bytes{};
    if (!parse_bytes("12 34 56 78", bytes)) return 1;

    std::uint32_t word = 0;
    std::cout << "parsed:";
    for (std::byte byte : bytes) {
        const auto value = std::to_integer<unsigned>(byte);
        word = (word << 8) | value;
        std::cout << ' ' << std::hex << std::setw(2)
                  << std::setfill('0') << value;
    }
    std::cout << "\nword: " << std::hex << word << '\n';
}

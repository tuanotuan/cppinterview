#include <array>
#include <charconv>
#include <iostream>
#include <string_view>
#include <system_error>

int main() {
    std::array<char, 16> buffer{};
    const auto written =
        std::to_chars(buffer.data(), buffer.data() + buffer.size(), 255, 16);
    if (written.ec != std::errc{}) return 1;

    const std::string_view encoded{
        buffer.data(), static_cast<std::size_t>(written.ptr - buffer.data())};
    int parsed = 0;
    const auto result =
        std::from_chars(encoded.data(), encoded.data() + encoded.size(),
                        parsed, 16);
    if (result.ec != std::errc{} ||
        result.ptr != encoded.data() + encoded.size()) return 1;

    std::cout << "encoded: " << encoded << '\n';
    std::cout << "parsed: " << parsed << '\n';
}

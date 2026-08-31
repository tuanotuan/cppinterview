#include <bit>
#include <cstdint>
#include <iostream>
#include <type_traits>
#include <utility>

enum class Code : std::uint16_t {
    value = 0x1234
};

int main() {
    static_assert(std::is_scoped_enum_v<Code>);
    auto raw = std::to_underlying(Code::value);
    auto reversed = std::byteswap(raw);

    std::cout << std::boolalpha
              << "scoped=" << std::is_scoped_enum_v<Code> << '\n'
              << "raw=" << raw << " swapped=" << reversed << '\n';
}

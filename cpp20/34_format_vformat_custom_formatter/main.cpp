// Day 34: format, vformat, and Custom Formatters
#include <iostream>
#include <string>

#if __has_include(<format>)
#include <format>
#define HAS_STD_FORMAT 1
#else
#define HAS_STD_FORMAT 0
#endif

struct Temperature {
    int value{};
};

#if HAS_STD_FORMAT
template<>
struct std::formatter<Temperature> : std::formatter<int> {
    auto format(const Temperature& temperature, format_context& context) const {
        return std::formatter<int>::format(temperature.value, context);
    }
};
#endif

int main() {
#if HAS_STD_FORMAT
    Temperature temperature{23};
    std::cout << std::format("direct = {} C\n", temperature);
    auto arguments = std::make_format_args(temperature);
    std::cout << std::vformat("vformat = {} C\n", arguments);
#else
    std::cout << "<format> is unavailable in this libstdc++ build\n";
#endif
}

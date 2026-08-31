#include <expected>
#include <iostream>
#include <string>
#include <version>

std::expected<int, std::string> begin_value() {
    return 3;
}

std::expected<int, std::string> double_positive(int value) {
    if (value <= 0)
        return std::unexpected(std::string{"not positive"});
    return value * 2;
}

int main() {
#if defined(__cpp_lib_expected) && __cpp_lib_expected >= 202211L
    auto result = begin_value()
        .and_then(double_positive)
        .transform([](int value) { return value + 1; })
        .or_else([](const std::string& error)
                     -> std::expected<int, std::string> {
            return std::unexpected(error);
        });
    std::cout << *result << '\n';
#else
    std::cout << "expected monadic operations unavailable\n";
#endif
}

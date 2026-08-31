#include <expected>
#include <iostream>
#include <string>

std::expected<int, std::string> parse(bool valid) {
    if (!valid)
        return std::unexpected(std::string{"invalid input"});
    return 42;
}

int main() {
    auto result = parse(true);
    if (result)
        std::cout << "value=" << *result << '\n';
    else
        std::cout << "error=" << result.error() << '\n';
}

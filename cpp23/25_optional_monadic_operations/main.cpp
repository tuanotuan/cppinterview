#include <iostream>
#include <optional>
#include <string>

int main() {
    std::optional<int> score{8};

    auto result = score
        .transform([](int value) { return value * 2; })
        .and_then([](int value) -> std::optional<std::string> {
            if (value >= 10)
                return std::to_string(value);
            return std::nullopt;
        })
        .or_else([] {
            return std::optional<std::string>{"no score"};
        });

    std::cout << *result << '\n';
}

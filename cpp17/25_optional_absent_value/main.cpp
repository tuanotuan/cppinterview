#include <iostream>
#include <optional>
#include <string_view>

std::optional<int> find_score(std::string_view name) {
    if (name == "Ada") {
        return 91;
    }
    return std::nullopt;
}

int main() {
    if (const auto score = find_score("Ada")) {
        std::cout << "Ada: " << *score << '\n';
    }

    const auto missing = find_score("Unknown");
    std::cout << "Unknown: " << missing.value_or(0) << '\n';
}

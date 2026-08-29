#include <any>
#include <iostream>
#include <string>

int main() {
    std::any value = 42;
    if (const auto* number = std::any_cast<int>(&value)) {
        std::cout << "integer: " << *number << '\n';
    }

    value = std::string{"C++17"};
    if (const auto* text = std::any_cast<std::string>(&value)) {
        std::cout << "text: " << *text << '\n';
    }

    std::cout << "is integer: "
              << (std::any_cast<int>(&value) != nullptr) << '\n';
}

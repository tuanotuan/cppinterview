#include <iostream>
#include <string>
#include <string_view>

std::string_view first_word(std::string_view text) {
    const auto space = text.find(' ');
    return text.substr(0, space);
}

int main() {
    const std::string owner = "Modern C++17";
    const std::string_view whole = owner;
    const std::string_view first = first_word(whole);

    std::cout << "first: " << first << '\n';
    std::cout << "source length: " << whole.size() << '\n';
}

#include <iostream>
#include <string>
#include <string_view>

int main() {
    std::string text{"C++23"};
    std::string_view view{text};

    std::cout << std::boolalpha
              << text.contains("++") << ' '
              << view.contains("23") << '\n';

    text.resize_and_overwrite(3, [](char* data, std::size_t size) {
        data[0] = 'C';
        data[1] = '+';
        data[2] = '+';
        return size;
    });
    std::cout << text << '\n';
}

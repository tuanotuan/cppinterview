#include <iostream>
#include <span>
#include <spanstream>

int main() {
    char buffer[32]{};
    std::ospanstream output{std::span<char>{buffer}};
    output << 12 << ' ' << 34;

    auto written = output.span();
    std::ispanstream input{
        std::span<const char>{written.data(), written.size()}};

    int first = 0;
    int second = 0;
    input >> first >> second;
    std::cout << first << ' ' << second << '\n';
}

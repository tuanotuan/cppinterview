#include <iostream>
#include <type_traits>

int main() {
    const int original = 7;
    const int& source = original;

    auto first = auto(source);   // C++23 decay-copy expression
    auto second = auto{source};

    static_assert(std::is_same_v<decltype(first), int>);
    static_assert(std::is_same_v<decltype(second), int>);

    first = 10;
    second = 20;
    std::cout << original << ' ' << first << ' ' << second << '\n';
}

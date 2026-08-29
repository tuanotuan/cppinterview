#include <initializer_list>
#include <iostream>
#include <type_traits>

int main() {
    auto direct{42};
    auto copy = {1, 2, 3};

    static_assert(std::is_same_v<decltype(direct), int>);
    static_assert(
        std::is_same_v<decltype(copy), std::initializer_list<int>>);

    // auto invalid{1, 2}; // ill-formed in C++17
    std::cout << "direct: " << direct << '\n';
    std::cout << "list size: " << copy.size() << '\n';
}

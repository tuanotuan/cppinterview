#include <iostream>
#include <ranges>

int main() {
    auto values = std::views::iota(1, 8)
                | std::views::filter([](int n) { return n % 2 == 0; })
                | std::views::transform([](int n) { return n * 2; });

    auto first = values.begin();
    auto last = values.end();  // The sentinel may have another type.

    while (first != last) {
        std::cout << *first << ' ';
        ++first;
    }
    std::cout << '\n';
}

// Day 32: View Pipelines, Borrowed Ranges, and Dangling Views
#include <iostream>
#include <ranges>
#include <span>
#include <vector>

int main() {
    static_assert(std::ranges::borrowed_range<std::span<int>>);
    static_assert(!std::ranges::borrowed_range<std::vector<int>>);

    std::vector values{1, 2, 3, 4, 5}; // Named owner stays alive.
    auto pipeline = values
        | std::views::filter([](int x) { return x % 2 != 0; })
        | std::views::transform([](int x) { return x * 10; });

    for (int value : pipeline) {
        std::cout << value << ' ';
    }
    std::cout << '\n';
}

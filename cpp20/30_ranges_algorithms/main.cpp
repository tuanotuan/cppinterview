// Day 30: Ranges Algorithms
#include <algorithm>
#include <iostream>
#include <ranges>
#include <vector>

int main() {
    std::vector values{4, 1, 3, 2};
    std::ranges::sort(values);
    auto found = std::ranges::find(values, 3);

    for (int value : values) {
        std::cout << value << ' ';
    }
    std::cout << "\nfound = " << *found << '\n';
}

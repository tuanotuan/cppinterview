// Day 31: Views and Lazy Evaluation
#include <iostream>
#include <ranges>
#include <vector>

int main() {
    std::vector values{1, 2, 3};
    int evaluations = 0;

    auto doubled = values | std::views::transform([&](int value) {
        ++evaluations;
        return value * 2;
    });

    std::cout << "before iteration = " << evaluations << '\n';
    for (int value : doubled) {
        std::cout << value << ' ';
    }
    std::cout << "\nafter iteration = " << evaluations << '\n';
}

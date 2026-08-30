// Day 23: Range-for Initializers and Range Lifetime
#include <iostream>
#include <vector>

int main() {
    int sum = 0;

    // The initializer's vector lives for the whole loop.
    for (std::vector<int> values{1, 2, 3, 4}; int value : values) {
        sum += value;
    }

    std::cout << "sum = " << sum << '\n';
}

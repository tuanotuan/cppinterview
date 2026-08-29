#include <algorithm>
#include <chrono>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> values{4, 1, 3, 2};

    const auto start = std::chrono::steady_clock::now();
    std::sort(values.begin(), values.end());
    const auto finish = std::chrono::steady_clock::now();

    std::cout << "sorted:";
    for (int value : values) {
        std::cout << ' ' << value;
    }
    const auto elapsed = finish - start;
    std::cout << "\nvalid duration: " << (elapsed.count() >= 0) << "\n";
}

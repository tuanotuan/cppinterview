#include <chrono>
#include <iostream>
#include <numeric>
#include <vector>

int main() {
    std::vector<int> values(1000);
    std::iota(values.begin(), values.end(), 0);
    volatile long long checksum = 0;

    const auto start = std::chrono::steady_clock::now();
    for (int repeat = 0; repeat < 1000; ++repeat) {
        checksum += std::accumulate(values.begin(), values.end(), 0LL);
    }
    const auto finish = std::chrono::steady_clock::now();

    std::cout << "checksum: " << checksum << "\n";
    std::cout << "valid duration: " << ((finish - start).count() >= 0) << "\n";
}

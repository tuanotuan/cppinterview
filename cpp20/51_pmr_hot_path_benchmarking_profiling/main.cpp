// Day 51: PMR, Allocation-Free Hot Paths, Benchmarking, and Profiling
#include <array>
#include <chrono>
#include <cstddef>
#include <iostream>
#include <memory_resource>
#include <numeric>
#include <vector>

int main() {
    std::array<std::byte, 4096> buffer{};
    std::pmr::monotonic_buffer_resource arena{
        buffer.data(), buffer.size(), std::pmr::null_memory_resource()};
    std::pmr::vector<int> values{&arena};

    values.reserve(100); // Allocate before the measured hot path.
    for (int i = 0; i < 100; ++i) values.push_back(i);

    auto start = std::chrono::steady_clock::now();
    for (int repeat = 0; repeat < 1000; ++repeat) {
        for (int& value : values) ++value;
    }
    auto elapsed = std::chrono::steady_clock::now() - start;

    std::cout << "sum = " << std::accumulate(values.begin(), values.end(), 0) << '\n';
    std::cout << "elapsed ns >= 0: " << std::boolalpha
              << (std::chrono::duration_cast<std::chrono::nanoseconds>(elapsed).count() >= 0)
              << '\n';
}

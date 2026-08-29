#include <array>
#include <cstddef>
#include <iostream>
#include <memory_resource>
#include <numeric>
#include <vector>

int main() {
    std::array<std::byte, 8192> storage{};
    std::pmr::monotonic_buffer_resource upstream{
        storage.data(), storage.size(),
        std::pmr::null_memory_resource()};
    std::pmr::unsynchronized_pool_resource pool{&upstream};
    std::pmr::vector<int> values{&pool};

    values.reserve(32); // setup phase
    const auto initial_capacity = values.capacity();
    for (int repeat = 0; repeat < 100; ++repeat) {
        values.clear(); // hot path reuses the reserved block
        for (int value = 0; value < 32; ++value) {
            values.push_back(value);
        }
    }

    std::cout << "capacity stable: "
              << (values.capacity() == initial_capacity) << '\n';
    std::cout << "sum: "
              << std::accumulate(values.begin(), values.end(), 0) << '\n';
}

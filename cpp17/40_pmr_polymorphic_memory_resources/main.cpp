#include <array>
#include <cstddef>
#include <iostream>
#include <memory_resource>
#include <numeric>
#include <vector>

int main() {
    std::array<std::byte, 1024> buffer{};
    std::pmr::monotonic_buffer_resource arena{
        buffer.data(), buffer.size()};
    std::pmr::vector<int> values{
        std::pmr::polymorphic_allocator<int>{&arena}};

    values.insert(values.end(), {1, 2, 3, 4});
    const int total = std::accumulate(values.begin(), values.end(), 0);
    std::cout << "size: " << values.size() << '\n';
    std::cout << "sum: " << total << '\n';
}

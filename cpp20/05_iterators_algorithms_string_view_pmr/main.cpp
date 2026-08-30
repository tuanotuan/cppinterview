// Day 5: Iterators, Algorithms, string_view, and PMR
#include <algorithm>
#include <array>
#include <cstddef>
#include <iostream>
#include <memory_resource>
#include <string>
#include <string_view>
#include <vector>

int main() {
    std::array<std::byte, 512> buffer{};
    std::pmr::monotonic_buffer_resource resource{buffer.data(), buffer.size()};
    std::pmr::vector<std::pmr::string> words{&resource};

    words.emplace_back("pear");
    words.emplace_back("apple");
    std::sort(words.begin(), words.end());

    for (auto it = words.begin(); it != words.end(); ++it) {
        std::string_view view{*it};
        std::cout << view << '\n';
    }
}

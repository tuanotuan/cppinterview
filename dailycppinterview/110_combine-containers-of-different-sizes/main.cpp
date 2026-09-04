// Real-World C++ Interviews Q110: Can you combine containers of different sizes?
// Key: Some algorithms accept multiple ranges, but an overload that receives only the first
// iterator of a secondary range assumes enough elements are available. Check sizes or use an
// interface that carries both ends; C++ ranges improve several APIs but do not erase every
// precondition.
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    const std::vector<int> left{1, 2, 3};
    const std::vector<int> right{10, 20};
    std::vector<int> sums;
    const auto count = std::min(left.size(), right.size());
    for (std::size_t index = 0; index < count; ++index) {
        sums.push_back(left[index] + right[index]);
    }
    std::cout << sums.size() << '\n';
}

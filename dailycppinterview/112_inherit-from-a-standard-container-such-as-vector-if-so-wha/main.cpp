// Real-World C++ Interviews Q112: Can we inherit from a standard container (such as
// std::vector)? If so what are the implications?
// Key: Deriving from a standard container is legal syntax but usually the wrong public
// abstraction because containers are not polymorphic bases and lack virtual destructors.
// Composition preserves invariants and limits the exposed API.
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> values{3, 1, 2};
    std::sort(values.begin(), values.end());
    std::cout << std::binary_search(values.begin(), values.end(), 2) << '\n';
}

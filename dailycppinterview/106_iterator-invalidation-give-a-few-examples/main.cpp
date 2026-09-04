// Real-World C++ Interviews Q106: What is iterator invalidation? Give a few examples.
// Key: Iterator invalidation means a container operation makes existing iterators, references,
// or pointers unusable. Reallocation invalidates all vector handles, erasing invalidates
// handles at or after the erased vector position, while node-based containers have different
// rules that must be checked per operation.
#include <iostream>
#include <vector>

int main() {
    std::vector<int> values{1, 2, 3};
    const auto old_data = values.data();
    values.reserve(100);
    const bool reallocated = old_data != values.data();
    std::cout << std::boolalpha << reallocated << '\n';
}

// Real-World C++ Interviews Q116: What is an Iterator class?
// Key: An iterator is an abstraction that identifies a position and supports operations
// required by an iterator category or concept; it need not literally be a class. Algorithms
// depend on those semantic operations rather than on one concrete container type.
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> values{3, 1, 2};
    std::sort(values.begin(), values.end());
    std::cout << std::binary_search(values.begin(), values.end(), 2) << '\n';
}

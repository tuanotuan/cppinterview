// Daily C++ Interview Q109: Do algorithms validate ranges?
// Key: Algorithms generally trust their iterator ranges and documented preconditions; they do
// not validate that two iterators form a valid range or that an ordering requirement holds.
// Violating those contracts can make the program undefined.
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> values{3, 1, 2};
    std::sort(values.begin(), values.end());
    std::cout << std::binary_search(values.begin(), values.end(), 2) << '\n';
}

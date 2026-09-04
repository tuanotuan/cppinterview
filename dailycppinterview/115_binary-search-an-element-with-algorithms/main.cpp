// Real-World C++ Interviews Q115: Binary search an element with algorithms!
// Key: `std::binary_search` requires the range to be partitioned according to the same ordering
// used by the search, which a normally sorted range satisfies. Sort first or maintain the
// invariant; calling it on the unsorted sample violates its precondition, so the result cannot
// be trusted.
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> numbers{1, 54, 7, 5335, 8};
    std::sort(numbers.begin(), numbers.end());
    std::cout << std::boolalpha
              << std::binary_search(numbers.begin(), numbers.end(), 7) << '\n';
}

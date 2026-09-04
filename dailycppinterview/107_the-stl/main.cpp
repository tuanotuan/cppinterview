// Daily C++ Interview Q107: What is the STL?
// Key: STL commonly refers to the generic containers, iterators, algorithms, function objects,
// and related utilities standardized from the original Standard Template Library design. The
// full C++ standard library is broader and also includes I/O, threading, filesystem, and more.
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> values{3, 1, 2};
    std::sort(values.begin(), values.end());
    std::cout << std::binary_search(values.begin(), values.end(), 2) << '\n';
}

// Daily C++ Interview Q108: What are the advantages of algorithms over raw loops?
// Key: Standard algorithms express intent, compose with iterator/range abstractions, reduce
// hand-written boundary errors, and can receive implementation optimization or execution-policy
// support. A raw loop remains appropriate when the operation cannot be expressed clearly as an
// algorithm.
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> values{3, 1, 2};
    std::sort(values.begin(), values.end());
    std::cout << std::binary_search(values.begin(), values.end(), 2) << '\n';
}

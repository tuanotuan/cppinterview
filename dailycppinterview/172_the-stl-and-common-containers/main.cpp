// Real-World C++ Interviews Q172: What is the Standard Template Library (STL)? Name some
// commonly used containers.
// Key: The STL is the generic-programming foundation of the C++ standard library built around
// containers, iterators, algorithms, and function objects. Common sequence containers include
// `vector`, `array`, `deque`, `list`, and `forward_list`; ordered associative containers
// include `map` and `set`; unordered variants are hash based; and adaptors include `stack`,
// `queue`, and `priority_queue`. Container choice should follow access pattern, invalidation
// rules, ordering, and complexity needs rather than habit.
#include <algorithm>
#include <iostream>
#include <string>
#include <unordered_map>
#include <vector>

int main() {
    std::vector<int> values{3, 1, 2};
    std::sort(values.begin(), values.end());

    std::unordered_map<std::string, int> counts{{"cpp", 3}};
    std::cout << values.front() << ' ' << counts.at("cpp") << std::endl;
}

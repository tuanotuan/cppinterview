// Real-World C++ Interviews Q173: What are lambda expressions in C++11 and later?
// Key: A lambda expression creates an unnamed closure object whose call operator contains the
// written body. Its capture list can copy or reference surrounding entities, use init-capture,
// or capture nothing; parameters may be typed or use `auto` for a generic lambda. Entities
// captured by copy cannot be modified through the closure's default const call operator unless
// the lambda is `mutable`, and only captureless lambdas convert directly to compatible function
// pointers.
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    const int threshold = 3;
    const std::vector<int> values{1, 3, 5, 7};
    const auto above = std::count_if(
        values.begin(),
        values.end(),
        [threshold](int value) { return value > threshold; }
    );
    std::cout << above << std::endl;
}

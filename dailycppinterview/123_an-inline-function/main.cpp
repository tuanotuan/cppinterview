// Real-World C++ Interviews Q123: What is an inline function?
// Key: An inline function may be defined identically in multiple translation units while
// denoting one entity under the ODR. `inline` is not a command that guarantees machine-code
// inlining; optimization decisions remain with the compiler.
#include <iostream>

inline int square(int value) {
    return value * value;
}

int main() {
    std::cout << square(6) << '\n';
}

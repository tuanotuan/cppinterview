// Real-World C++ Interviews Q171: Explain templates in C++ and provide a simple example.
// Key: Templates parameterize functions, classes, aliases, or variables over types, values, and
// in some cases other templates. The compiler forms specializations when they are needed,
// enabling zero-overhead generic code but potentially increasing compile time and generated
// code size. C++20 concepts can state requirements explicitly and improve overload selection
// and diagnostics compared with unconstrained substitution failures.
#include <concepts>
#include <cstddef>
#include <iostream>

template<std::totally_ordered T>
T max_value(T left, T right) {
    return left < right ? right : left;
}

template<class T, std::size_t Size>
struct FixedArray {
    T values[Size]{};
};

int main() {
    FixedArray<int, 3> values{{1, 2, 3}};
    std::cout << max_value(values.values[0], values.values[2]) << std::endl;
}

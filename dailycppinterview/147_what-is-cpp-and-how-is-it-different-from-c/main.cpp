// Real-World C++ Interviews Q147: What is C++? How is it different from C?
// Key: C++ is a general-purpose, multi-paradigm language that evolved from C and adds
// abstraction mechanisms such as classes, templates, RAII, overloading, exceptions, and a rich
// standard library. C and C++ share much syntax but are separate languages with different type
// rules, object and lifetime models, valid programs, and idioms; C++ is not merely C with
// classes.
#include <iostream>
#include <vector>

template<class T>
T sum(const std::vector<T>& values) {
    T result{};
    for (const T& value : values) result += value;
    return result;
}

int main() {
    const std::vector<int> values{1, 2, 3};
    std::cout << sum(values) << std::endl;
}

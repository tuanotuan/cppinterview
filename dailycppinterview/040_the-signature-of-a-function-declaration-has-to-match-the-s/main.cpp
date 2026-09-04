// Real-World C++ Interviews Q040: Does the signature of a function declaration has to match the
// signature of the function definition?
// Key: Declarations for the same function must agree on parameter types and function
// qualifiers; otherwise they denote a different overload or fail to match a definition. Return
// type alone cannot distinguish overloads, while default arguments are not part of the function
// type.
#include <iostream>

class Counter {
public:
    explicit Counter(int value) : value_(value) {}
    int value() const { return value_; }
    void increment() { ++value_; }

private:
    int value_;
};

int main() {
    const Counter counter{40};
    std::cout << counter.value() << '\n';
}

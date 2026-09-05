// Real-World C++ Interviews Q156: What is the difference between struct and class in C++?
// Key: `struct` and `class` define the same kind of class type and can both have constructors,
// member functions, templates, inheritance, and virtual dispatch. The language differences are
// defaults: members and base classes are public in a `struct`, but private in a `class`.
// Conventionally, structs model simple value-like aggregates and classes emphasize hidden
// invariants, but that is a style choice rather than a language restriction.
#include <iostream>

struct Point {
    int x{};
    int y{};
};

class Counter {
public:
    explicit Counter(int value) : value_(value) {}
    int value() const { return value_; }

private:
    int value_{};
};

int main() {
    const Point point{2, 3};
    const Counter counter{4};
    std::cout << point.x + point.y + counter.value() << std::endl;
}

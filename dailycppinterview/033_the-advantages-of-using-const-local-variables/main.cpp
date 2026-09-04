// Real-World C++ Interviews Q033: What are the advantages of using const local variables?
// Key: A const local variable documents that its value is stable after initialization and lets
// the compiler reject accidental writes. It narrows the mutable state a reader must track,
// though const should not be added when later reassignment is intentional.
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
    const Counter counter{33};
    std::cout << counter.value() << '\n';
}

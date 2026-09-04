// Daily C++ Interview Q038: Should you take plain old data types by const reference as a
// function parameter?
// Key: Small scalar and other cheap value types should normally be passed by value; a reference
// can cost the same size while adding indirection and aliasing. Use const reference when
// copying is materially expensive or identity matters.
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
    const Counter counter{38};
    std::cout << counter.value() << '\n';
}

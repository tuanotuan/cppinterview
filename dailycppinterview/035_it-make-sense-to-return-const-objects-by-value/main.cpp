// Real-World C++ Interviews Q035: Does it make sense to return const objects by value?
// Key: Usually no. Top-level const on a returned value gives the caller no durable protection
// and can inhibit moving in older or generic code. Return an ordinary value and let the caller
// decide whether its receiving object is const.
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
    const Counter counter{35};
    std::cout << counter.value() << '\n';
}

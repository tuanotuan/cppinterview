#include <iostream>

class Counter {
public:
    explicit Counter(int start) : value_(start) {}

    void increment() {
        ++value_;
    }

    int value() const {
        return value_;
    }

private:
    int value_;
};

int main() {
    Counter counter(5);
    counter.increment();
    std::cout << "counter=" << counter.value() << '\n';
}

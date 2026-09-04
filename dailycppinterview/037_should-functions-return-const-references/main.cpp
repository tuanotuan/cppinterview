// Real-World C++ Interviews Q037: Should functions return const references?
// Key: A function may return a const reference only when the referred object is guaranteed to
// outlive every use by the caller. It avoids a copy and prevents mutation through that
// reference, but returning a local or short-lived subobject dangles.
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
    const Counter counter{37};
    std::cout << counter.value() << '\n';
}

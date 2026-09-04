// Real-World C++ Interviews Q039: Should you pass objects by const reference as a function
// parameter?
// Key: Use `const T&` for a required, non-owning read-only parameter when copying `T` is
// expensive. Use `T` when the function needs its own value, `T&` for mutation, and pointer-like
// forms when nullability or ownership must be expressed.
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
    const Counter counter{39};
    std::cout << counter.value() << '\n';
}

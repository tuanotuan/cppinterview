// Real-World C++ Interviews Q036: How should you return const pointers from a function?
// Key: Return a pointer-to-const, `const T*`, when the caller may observe but not mutate the
// pointee through that handle. Making the pointer value itself top-level const in a return type
// is discarded and does not constrain the caller.
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
    const Counter counter{36};
    std::cout << counter.value() << '\n';
}

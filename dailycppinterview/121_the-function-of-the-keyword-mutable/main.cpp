// Daily C++ Interview Q121: What is the function of the keyword mutable?
// Key: A mutable data member may be modified even through a const object, which supports
// logically const caches, counters, or mutexes without changing externally visible value. In a
// lambda, `mutable` lets a non-const call operator modify captured-by-value state.
#include <iostream>
#include <optional>

class Value {
public:
    explicit Value(int input) : input_(input) {}
    int doubled() const {
        if (!cache_) cache_ = input_ * 2;
        return *cache_;
    }

private:
    int input_;
    mutable std::optional<int> cache_;
};

int main() {
    const Value value{21};
    std::cout << value.doubled() << '\n';
}

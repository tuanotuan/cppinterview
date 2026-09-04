// Daily C++ Interview Q034: Is it a good idea to have const members in a class?
// Key: Const data members can model truly immutable state, but they delete or restrict
// generated assignment operations and complicate regular value semantics. Prefer private state
// protected by class invariants unless per-object immutability is a deliberate requirement.
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
    const Counter counter{34};
    std::cout << counter.value() << '\n';
}

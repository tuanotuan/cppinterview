// Real-World C++ Interviews Q136: What is RVO?
// Key: RVO is copy elision for an object returned by value. C++17 guarantees elision for
// matching prvalue cases, while NRVO for a named local remains permitted rather than
// guaranteed; eligible elision may omit copy/move even when those operations have side effects.
#include <iostream>

struct Value {
    Value() = default;
    Value(const Value&) { std::cout << "copy\n"; }
};

Value create() {
    return Value{};
}

int main() {
    [[maybe_unused]] Value value = create();
}

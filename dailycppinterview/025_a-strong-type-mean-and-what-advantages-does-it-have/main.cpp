// Real-World C++ Interviews Q025: What does a strong type mean and what advantages does it
// have?
// Key: A strong type wraps a representation in a distinct domain type so values with the same
// underlying type cannot be mixed accidentally. It centralizes invariants, improves overload
// safety, and makes interfaces self-documenting.
#include <iostream>

struct Base {
    virtual ~Base() = default;
    virtual int value() const { return 1; }
};

struct Derived final : Base {
    int value() const override { return 25; }
};

int main() {
    Derived derived;
    const Base& base = derived;
    std::cout << base.value() << '\n';
}

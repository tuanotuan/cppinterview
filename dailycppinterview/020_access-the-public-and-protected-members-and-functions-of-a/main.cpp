// Real-World C++ Interviews Q020: Can you access the public and protected members and functions
// of a base class if you have private inheritance?
// Key: Yes, the derived implementation can access inherited public and protected members.
// Private inheritance changes their accessibility through the derived interface and blocks
// implicit public conversion to the base for outside callers.
#include <iostream>

struct Base {
    virtual ~Base() = default;
    virtual int value() const { return 1; }
};

struct Derived final : Base {
    int value() const override { return 20; }
};

int main() {
    Derived derived;
    const Base& base = derived;
    std::cout << base.value() << '\n';
}

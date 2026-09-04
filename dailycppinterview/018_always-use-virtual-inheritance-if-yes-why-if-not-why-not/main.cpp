// Daily C++ Interview Q018: Should we always use virtual inheritance? If yes, why? If not, why
// not?
// Key: No. Use virtual inheritance only when multiple inheritance must represent one shared
// base identity, typically a diamond. It adds layout, construction, and reasoning costs, so
// ordinary composition or non-virtual inheritance is preferable otherwise.
#include <iostream>

struct Base {
    virtual ~Base() = default;
    virtual int value() const { return 1; }
};

struct Derived final : Base {
    int value() const override { return 18; }
};

int main() {
    Derived derived;
    const Base& base = derived;
    std::cout << base.value() << '\n';
}

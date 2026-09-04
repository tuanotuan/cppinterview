// Daily C++ Interview Q031: What kind of captures are available for lambda expressions?
// Key: Captures can be explicit by value or reference, defaulted with `[=]` or `[&]`, include
// `this` or `*this`, and use init-capture to create a new member of the closure. Choose capture
// per lifetime and mutation needs rather than defaulting blindly.
#include <iostream>
#include <memory>

int main() {
    int by_reference = 1;
    auto owned = std::make_unique<int>(2);
    auto call = [copy = 3, &by_reference, value = std::move(owned)] {
        ++by_reference;
        return copy + *value;
    };
    std::cout << call() << ' ' << by_reference << '\n';
}

// Daily C++ Interview Q056: Should you use smart pointers over raw pointers all the time?
// Key: No. Smart pointers should represent ownership; raw pointers and references remain
// appropriate non-owning observers, and automatic objects need no pointer. The important rule
// is that every owning relationship is explicit and unambiguous.
#include <iostream>
#include <memory>

struct Resource {
    explicit Resource(int value) : value(value) {}
    int value;
};

int main() {
    auto owner = std::make_unique<Resource>(56);
    const Resource* observer = owner.get();
    std::cout << observer->value << '\n';
}

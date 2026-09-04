// Daily C++ Interview Q057: When and why should we initialize pointers to nullptr?
// Key: Initialize a pointer to `nullptr` when an empty state is valid and no real target is
// available yet, so testing it is defined. Prefer immediate initialization to a valid target
// when possible, because null adds another state every user must handle.
#include <iostream>
#include <memory>

struct Resource {
    explicit Resource(int value) : value(value) {}
    int value;
};

int main() {
    auto owner = std::make_unique<Resource>(57);
    const Resource* observer = owner.get();
    std::cout << observer->value << '\n';
}

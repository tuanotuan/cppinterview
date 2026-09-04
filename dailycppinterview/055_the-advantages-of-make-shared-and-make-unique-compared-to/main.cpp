// Daily C++ Interview Q055: What are the advantages of std::make_shared and std::make_unique
// compared to the new operator?
// Key: `make_unique` and `make_shared` express ownership without a naked `new` and provide
// exception-safe construction. `make_shared` commonly combines object and control block in one
// allocation, though weak references may keep that combined allocation alive and custom deleter
// needs can favor direct construction.
#include <iostream>
#include <memory>

struct Resource {
    explicit Resource(int value) : value(value) {}
    int value;
};

int main() {
    auto owner = std::make_unique<Resource>(55);
    const Resource* observer = owner.get();
    std::cout << observer->value << '\n';
}

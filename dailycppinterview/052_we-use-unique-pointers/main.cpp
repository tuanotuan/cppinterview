// Daily C++ Interview Q052: When should we use unique pointers?
// Key: Use `std::unique_ptr` when one object exclusively owns a dynamically allocated resource
// and ownership may be transferred. Prefer direct objects when allocation or nullable ownership
// is unnecessary, and pass observers as references or raw pointers.
#include <iostream>
#include <memory>

int main() {
    auto owner = std::make_unique<int>(42);
    auto next_owner = std::move(owner);
    std::cout << *next_owner << ' ' << std::boolalpha << (owner == nullptr) << '\n';
}

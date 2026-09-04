// Daily C++ Interview Q053: What are the reasons to use shared pointers?
// Key: Use `std::shared_ptr` only when several independent owners genuinely determine one
// lifetime. Reference counting makes ownership explicit, but adds a control block and
// atomic-count overhead and does not make the pointee itself thread-safe.
#include <iostream>
#include <memory>

int main() {
    auto first = std::make_shared<int>(42);
    auto second = first;
    std::cout << *second << ' ' << first.use_count() << '\n';
}

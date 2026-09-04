// Real-World C++ Interviews Q054: When to use a weak pointer?
// Key: Use `std::weak_ptr` as a non-owning observer of an object managed by `shared_ptr`,
// especially to break ownership cycles. Call `lock()` and test the returned `shared_ptr` before
// accessing the object.
#include <iostream>
#include <memory>

int main() {
    auto owner = std::make_shared<int>(42);
    std::weak_ptr<int> observer = owner;
    if (auto locked = observer.lock()) std::cout << *locked << '\n';
}

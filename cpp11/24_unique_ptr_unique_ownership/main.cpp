#include <iostream>
#include <memory>
#include <utility>

int main() {
    std::unique_ptr<int> first(new int(42));
    std::cout << "first=" << *first << '\n';

    std::unique_ptr<int> second = std::move(first);

    std::cout << "old_empty=" << (first == nullptr) << '\n';
    std::cout << "new_owner=" << *second << '\n';

    // Copying is forbidden: ownership is unique.
}

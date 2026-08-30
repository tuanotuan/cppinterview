// Day 2: Lifetime, RAII, Ownership, and Non-Owning Views
#include <iostream>
#include <span>
#include <vector>

int main() {
    std::vector<int> owner{10, 20, 30}; // Owns the elements.
    std::span<int> view{owner};         // Borrows the elements.

    view.front() = 99;

    std::cout << "owner[0] = " << owner[0] << '\n';
    std::cout << "view size = " << view.size() << '\n';
}

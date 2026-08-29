#include <iostream>
#include <memory>
#include <utility>

int main() {
    auto source = std::make_unique<int>(42);
    auto destination = std::move(source); // transfer ownership

    std::cout << "source owns: " << static_cast<bool>(source) << "\n";
    std::cout << "destination value: " << *destination << "\n";
}

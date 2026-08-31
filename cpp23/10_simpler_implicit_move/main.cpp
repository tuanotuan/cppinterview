#include <iostream>
#include <memory>

std::unique_ptr<int> pass(std::unique_ptr<int> value) {
    // The eligible parameter is implicitly moved on return.
    return value;
}

int main() {
    auto source = std::make_unique<int>(42);
    auto result = pass(std::move(source));
    std::cout << *result << '\n';
}

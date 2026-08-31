#include <iostream>
#include <string>
#include <utility>

void inspect(const std::string&) {
    std::cout << "lvalue\n";
}

void inspect(std::string&&) {
    std::cout << "rvalue\n";
}

template <class T>
void relay(T&& value) {
    // Preserve the caller's value category.
    inspect(std::forward<T>(value));
}

int main() {
    std::string name{"C++23"};
    relay(name);
    relay(std::string{"temporary"});
}

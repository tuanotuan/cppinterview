#include <iostream>

void category(int&) {
    std::cout << "lvalue\n";
}

void category(int&&) {
    std::cout << "rvalue-or-xvalue\n";
}

int main() {
    int value = 5;

    category(value);                    // lvalue expression
    category(7);                        // prvalue expression
    category(static_cast<int&&>(value)); // xvalue expression
}

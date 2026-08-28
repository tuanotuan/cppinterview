#include <iostream>

void inspect(int&) {
    std::cout << "persistent\n";
}

void inspect(int&&) {
    std::cout << "temporary\n";
}

int main() {
    int value = 7;
    int&& temporary = 40 + 2;
    temporary += 1;

    inspect(value);
    inspect(9);
    inspect(temporary); // a named variable is an lvalue expression
    std::cout << "stored=" << temporary << '\n';
}

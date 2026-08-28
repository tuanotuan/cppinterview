#include <cstddef>
#include <iostream>

void inspect(int* pointer) {
    std::cout << "pointer=" << *pointer << '\n';
}

void inspect(std::nullptr_t) {
    std::cout << "null\n";
}

int main() {
    int value = 42;
    inspect(&value);
    inspect(nullptr); // selects the exact nullptr overload
}

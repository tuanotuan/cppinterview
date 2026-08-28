#include <iostream>
#include <utility>

void consume(int&) {
    std::cout << "lvalue\n";
}

void consume(int&&) {
    std::cout << "rvalue\n";
}

template <typename T>
void relay(T&& value) {
    consume(std::forward<T>(value));
}

int main() {
    int number = 7;
    relay(number);
    relay(9);
}

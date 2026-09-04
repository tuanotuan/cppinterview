// Daily C++ Interview Q059: What does std::forward forward?
// Key: `std::forward<T>` conditionally casts a forwarding-reference argument according to
// deduced `T`, preserving whether the original caller supplied an lvalue or rvalue. Use it only
// with the matching deduced template parameter.
#include <iostream>
#include <utility>

void consume(int&) { std::cout << "lvalue\n"; }
void consume(int&&) { std::cout << "rvalue\n"; }

template<class T>
void relay(T&& value) {
    consume(std::forward<T>(value));
}

int main() {
    int value = 0;
    relay(value);
    relay(1);
}

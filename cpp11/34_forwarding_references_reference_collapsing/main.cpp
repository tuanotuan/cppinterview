#include <iostream>
#include <type_traits>

template <typename T>
void inspect(T&&) {
    // For an lvalue call, T is deduced as U& and U& && collapses to U&.
    const bool from_lvalue = std::is_lvalue_reference<T>::value;
    std::cout << (from_lvalue ? "lvalue" : "rvalue") << '\n';
}

int main() {
    int value = 7;

    inspect(value); // T becomes int&
    inspect(9);     // T becomes int
}

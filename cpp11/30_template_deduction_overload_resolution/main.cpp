#include <iostream>

template <typename T>
void show(T value) {
    std::cout << "value=" << value << '\n';
}

template <typename T>
void show(T* pointer) {
    std::cout << "pointer=" << *pointer << '\n';
}

int main() {
    int number = 42;

    show(number);  // T is int; general overload
    show(&number); // T is int; pointer overload is more specialized
    show<double>(2); // explicit template argument converts to double
}

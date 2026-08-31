#include <concepts>
#include <iostream>

template <class T>
concept Addable = requires(T a, T b) {
    { a + b } -> std::same_as<T>;
};

template <Addable T>
T add(T a, T b) {
    return a + b;
}

template <class Derived>
struct Printable {
    void print() const {
        std::cout << static_cast<const Derived&>(*this).value() << '\n';
    }
};

struct Number : Printable<Number> {
    int data{7};
    int value() const { return data; }
};

int main() {
    std::cout << add(2, 3) << '\n';
    Number number;
    number.print();
}

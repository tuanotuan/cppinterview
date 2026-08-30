// Day 8: Defining Custom Concepts
#include <concepts>
#include <iostream>

template<class T>
concept Addable = requires(T a, T b) {
    { a + b } -> std::same_as<T>;
};

template<Addable T>
T twice(T value) {
    return value + value;
}

int main() {
    std::cout << "twice(6) = " << twice(6) << '\n';
}

// Day 7: Requires Expressions and Requirement Kinds
#include <concepts>
#include <iostream>

struct Number {
    using value_type = int;
    int value{};
};

Number operator+(Number a, Number b) {
    return {a.value + b.value};
}

template<class T>
concept SmallAddable = requires(T a, T b) {
    typename T::value_type;              // Type requirement
    a + b;                               // Simple requirement
    { a + b } -> std::same_as<T>;        // Compound requirement
    requires (sizeof(T) <= 8);           // Nested requirement
};

int main() {
    std::cout << std::boolalpha << SmallAddable<Number> << '\n';
}

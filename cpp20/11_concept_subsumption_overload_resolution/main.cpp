// Day 11: Concept Subsumption and Overload Resolution
#include <concepts>
#include <iostream>

template<class T>
concept Integer = std::integral<T>;

template<class T>
concept SignedInteger = Integer<T> && std::signed_integral<T>;

void classify(Integer auto) {
    std::cout << "integer\n";
}

void classify(SignedInteger auto) {
    std::cout << "signed integer\n";
}

int main() {
    classify(1);
    classify(1u);
}

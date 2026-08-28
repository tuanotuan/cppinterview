#include <iostream>
#include <type_traits>

template <typename T>
typename std::enable_if<std::is_integral<T>::value, const char*>::type
kind(T) {
    return "integral";
}

template <typename T>
typename std::enable_if<!std::is_integral<T>::value, const char*>::type
kind(T) {
    return "non-integral";
}

int main() {
    std::cout << kind(42) << '\n';
    std::cout << kind(3.5) << '\n';
}

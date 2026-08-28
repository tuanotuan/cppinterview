#include <iostream>

template <typename T>
T sum(T value) {
    return value; // ends the recursive pack expansion
}

template <typename T, typename... Rest>
T sum(T first, Rest... rest) {
    return first + sum(rest...);
}

template <typename... T>
void show_count(T... values) {
    (void)sizeof...(values);
    std::cout << "count=" << sizeof...(T) << '\n';
}

int main() {
    std::cout << "sum=" << sum(1, 2, 3, 4) << '\n';
    show_count('a', 2, 3.0);
}

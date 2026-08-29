#include <iostream>

template <class... Ts>
constexpr auto sum(Ts... values) {
    return (0 + ... + values);
}

template <class... Ts>
void print_values(Ts... values) {
    std::cout << "values:";
    ((std::cout << ' ' << values), ...);
    std::cout << '\n';
}

int main() {
    static_assert(sum() == 0);
    static_assert(sum(1, 2, 3, 4) == 10);
    std::cout << "sum: " << sum(1, 2, 3, 4) << '\n';
    print_values(1, 2, 3, 4);
}

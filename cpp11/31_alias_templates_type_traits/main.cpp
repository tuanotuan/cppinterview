#include <iostream>
#include <type_traits>
#include <vector>

template <typename T>
using Vec = std::vector<T>;

int main() {
    Vec<int> values{1, 2, 3};

    std::cout << std::boolalpha;
    std::cout << "int_integral=" << std::is_integral<int>::value << '\n';
    std::cout << "double_integral=" << std::is_integral<double>::value << '\n';
    std::cout << "is_reference=" << std::is_reference<int&>::value << '\n';
    std::cout << "size=" << values.size() << '\n';
}

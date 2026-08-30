// Day 28: span, Static Extent, and Dynamic Extent
#include <array>
#include <iostream>
#include <span>

int main() {
    std::array data{10, 20, 30};
    std::span<int, 3> fixed{data};
    std::span<int> dynamic{data};

    fixed[1] = 99;

    std::cout << "fixed extent = " << decltype(fixed)::extent << '\n';
    std::cout << "dynamic extent marker = " << decltype(dynamic)::extent << '\n';
    std::cout << "dynamic size = " << dynamic.size() << '\n';
    std::cout << "data[1] = " << data[1] << '\n';
}

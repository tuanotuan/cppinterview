#include <iostream>

constexpr int square(int value) {
    return value * value; // valid C++11 constexpr body
}

static_assert(square(3) == 9, "square must work");

int main() {
    constexpr int side = 4;
    int cells[square(side)] = {};

    cells[0] = 7;
    std::cout << "cell_count=" << square(side) << '\n';
    std::cout << "first=" << cells[0] << '\n';
}

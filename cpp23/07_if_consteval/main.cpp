#include <iostream>

constexpr int scale(int value) {
    if consteval {
        return value * 2;
    } else {
        return value * 3;
    }
}

constexpr int offset(int value) {
    if !consteval {
        return value + 10;
    } else {
        return value + 1;
    }
}

int main() {
    constexpr int compile_time = scale(4);
    int input = 4;
    std::cout << compile_time << ' ' << scale(input) << ' '
              << offset(input) << '\n';
}

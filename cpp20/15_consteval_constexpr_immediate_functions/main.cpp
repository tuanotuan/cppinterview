// Day 15: consteval, constexpr, and Immediate Functions
#include <iostream>

constexpr int square(int value) {
    return value * value;
}

consteval int checked(int value) {
    if (value < 0) {
        throw "negative value";
    }
    return value;
}

int main() {
    constexpr int limit = checked(5); // Must run at compile time.
    int runtime = 4;

    std::cout << "limit = " << limit << '\n';
    std::cout << "runtime square = " << square(runtime) << '\n';
}

#include <iostream>

constexpr int factorial(int n) {
    int result = 1;
    for (int i = 2; i <= n; ++i) {
        result *= i;
    }
    return result;
}

int main() {
    constexpr int value = factorial(5);
    static_assert(value == 120, "factorial must be computed correctly");
    std::cout << "factorial: " << value << "\n";
}

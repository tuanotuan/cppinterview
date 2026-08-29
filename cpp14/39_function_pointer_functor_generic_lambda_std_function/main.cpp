#include <functional>
#include <iostream>

int add(int left, int right) { return left + right; }

struct Multiplier {
    int factor;
    int operator()(int value) const { return value * factor; }
};

int main() {
    int (*pointer)(int, int) = add;
    Multiplier triple{3};
    auto subtract = [](auto left, auto right) { return left - right; };
    std::function<int(int, int)> operation = pointer;

    std::cout << "pointer: " << pointer(2, 5) << "\n";
    std::cout << "functor: " << triple(4) << "\n";
    std::cout << "lambda: " << subtract(9, 3) << "\n";
    std::cout << "std::function: " << operation(6, 7) << "\n";
}

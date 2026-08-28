#include <iostream>

auto add(int left, double right) -> decltype(left + right) {
    return left + right;
}

int main() {
    int count = 4;
    decltype(count) copy = 6; // exactly int

    const auto result = add(count, 2.5);

    std::cout << "copy=" << copy << '\n';
    std::cout << "result=" << result << '\n';
}

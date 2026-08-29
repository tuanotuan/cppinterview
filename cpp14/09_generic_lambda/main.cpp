#include <iostream>

int main() {
    auto add = [](auto left, auto right) {
        return left + right;
    };

    std::cout << "integers: " << add(2, 3) << "\n";
    std::cout << "doubles: " << add(1.5, 2.0) << "\n";
}

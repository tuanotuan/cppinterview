#include <iostream>

#if __cplusplus < 201402L
#error This project requires C++14
#endif

int main() {
    auto multiply = [](auto left, auto right) {
        return left * right;
    };

    std::cout << "C++14 compatible: true\n";
    std::cout << "result: " << multiply(6, 7) << "\n";
}

// Day 12: Explicit Template Parameter Lists for Lambdas
#include <iostream>

int main() {
    auto maximum = []<class T>(T a, T b) {
        return a < b ? b : a;
    };

    std::cout << "max = " << maximum(4, 9) << '\n';
}

#include <iostream>

int main() {
    int base = 10;
    auto twice = [snapshot = base * 2] {
        return snapshot;
    };

    base = 99;
    std::cout << "captured result: " << twice() << "\n";
    std::cout << "current base: " << base << "\n";
}

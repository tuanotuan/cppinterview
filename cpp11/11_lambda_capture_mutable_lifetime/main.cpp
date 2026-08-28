#include <iostream>

int main() {
    int base = 10;
    int total = 0;

    auto private_counter = [base](int add) mutable {
        base += add; // changes the captured copy
        return base;
    };

    auto accumulate = [&total](int value) {
        total += value; // safe while total is alive
    };

    std::cout << private_counter(2) << ',' << private_counter(2) << '\n';
    accumulate(3);
    accumulate(4);
    std::cout << "base=" << base << " total=" << total << '\n';
}

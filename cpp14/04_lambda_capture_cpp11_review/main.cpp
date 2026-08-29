#include <iostream>

int main() {
    double rate = 0.10;
    int calls = 0;

    auto add_tax = [rate, &calls](double price) {
        ++calls; // reference capture changes the original counter
        return price * (1.0 + rate); // value capture keeps a snapshot
    };

    rate = 0.20;
    std::cout << "total: " << add_tax(100.0) << "\n";
    std::cout << "calls: " << calls << "\n";
}

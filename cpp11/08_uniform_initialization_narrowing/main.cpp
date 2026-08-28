#include <iostream>

int main() {
    int count{3};
    double price{2.5};
    bool active{true};
    int values[]{1, 2, 3};

    // int bad{3.5}; // error: narrowing conversion

    const double total{count * price};
    std::cout << "active=" << active << '\n';
    std::cout << "total=" << total << '\n';
    std::cout << "sum=" << values[0] + values[1] + values[2] << '\n';
}

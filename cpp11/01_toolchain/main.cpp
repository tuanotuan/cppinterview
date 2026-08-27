#include <iostream>

int main() {
    // __cplusplus reports the selected language mode.
    std::cout << "cplusplus=" << __cplusplus << '\n';

    const int price = 7;
    const int quantity = 6;
    std::cout << "total=" << price * quantity << '\n';
}

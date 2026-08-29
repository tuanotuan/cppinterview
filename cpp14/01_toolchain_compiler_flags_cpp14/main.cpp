#include <iostream>

#if __cplusplus < 201402L
#error This example requires C++14 or newer
#endif

int main() {
    constexpr int permissions = 0b1010; // C++14 binary literal
    std::cout << "C++ level: " << __cplusplus << "\n";
    std::cout << "permissions: " << permissions << "\n";
}

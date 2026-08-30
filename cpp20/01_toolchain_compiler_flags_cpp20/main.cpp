// Day 1: Toolchain, Compiler Flags, and C++20 Mode
#include <iostream>

int main() {
    std::cout << "__cplusplus = " << __cplusplus << '\n';

#if __cplusplus >= 202002L
    std::cout << "C++20 mode active\n";
#else
    std::cout << "C++20 mode not active\n";
#endif
}

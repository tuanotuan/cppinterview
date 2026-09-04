// Daily C++ Interview Q145: Should you use angle brackets(<filename>) or double
// quotes(“filename”) to include?
// Key: Quotes normally search relative or user header locations before implementation include
// paths, while angle brackets use the implementation's system-style search. Exact search order
// is implementation-defined; conventionally use quotes for project-local headers and angles for
// standard or external dependencies.
#include <iostream>

int classify(int value) {
    if (value < 0) return -1;
    if (value == 0) return 0;
    return 1;
}

int main() {
    std::cout << classify(145) << '\n';
}

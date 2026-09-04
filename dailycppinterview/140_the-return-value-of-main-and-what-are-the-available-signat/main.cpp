// Daily C++ Interview Q140: What is the return value of main and what are the available
// signatures?
// Key: Standard `main` returns `int`; the usual signatures are `int main()` and `int main(int
// argc, char* argv[])`, with implementation-defined additional forms possible. Falling off the
// end returns zero, and `argc` includes the program name when it is positive.
#include <iostream>

int classify(int value) {
    if (value < 0) return -1;
    if (value == 0) return 0;
    return 1;
}

int main() {
    std::cout << classify(140) << '\n';
}

// Real-World C++ Interviews Q083: What are default arguments? How are they evaluated in a C++
// function?
// Key: A default argument is substituted at the call site from declarations visible there,
// using the function's static type; its expression is evaluated when the call executes.
// Defaults are not dynamically dispatched, so combining them with virtual functions can
// surprise callers.
#include <iostream>

int next() {
    static int value = 0;
    return ++value;
}

void show(int value = next()) {
    std::cout << value << '\n';
}

int main() {
    show();
    show();
}

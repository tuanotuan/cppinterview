// Real-World C++ Interviews Q120: Should base class destructors be virtual?
// Key: Use a public virtual destructor for a base intended to be deleted polymorphically. Use a
// protected non-virtual destructor when deletion through the base must be forbidden; not every
// base class needs virtual destruction.
#include <iostream>

int classify(int value) {
    if (value < 0) return -1;
    if (value == 0) return 0;
    return 1;
}

int main() {
    std::cout << classify(120) << '\n';
}

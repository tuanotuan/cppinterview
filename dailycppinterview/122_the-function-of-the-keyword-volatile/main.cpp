// Real-World C++ Interviews Q122: What is the function of the keyword volatile?
// Key: `volatile` tells the implementation that accesses are observable in a limited,
// implementation-oriented sense, useful mainly for some memory-mapped I/O and signal scenarios.
// It provides neither atomicity nor inter-thread synchronization; use atomics for concurrency.
#include <iostream>

int classify(int value) {
    if (value < 0) return -1;
    if (value == 0) return 0;
    return 1;
}

int main() {
    std::cout << classify(122) << '\n';
}

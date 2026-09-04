// Real-World C++ Interviews Q118: What are default arguments? How are they evaluated in a C++
// function?
// Key: Default arguments are chosen from the declaration visible at the call site and according
// to static type, then evaluated when the call runs. They are not part of virtual dispatch and
// changes can require caller recompilation.
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

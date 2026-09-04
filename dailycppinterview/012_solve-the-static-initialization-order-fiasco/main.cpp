// Real-World C++ Interviews Q012: How to solve the static initialization order fiasco?
// Key: The usual fix is construct-on-first-use: return a function-local static so
// initialization happens on first call and is thread-safe since C++11. Also minimize global
// state and make dependencies explicit; inline variables alone do not repair a cyclic
// initialization design.
#include <iostream>

int next_id() {
    static int value = 0;
    return ++value;
}

int main() {
    std::cout << next_id() << ' ' << next_id() << '\n';
}

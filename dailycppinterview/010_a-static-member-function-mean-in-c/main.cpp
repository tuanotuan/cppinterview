// Real-World C++ Interviews Q010: What does a static member function mean in C++?
// Key: A static member function has no `this` pointer and can be called through the class name.
// It can directly access only static members, although it may operate on objects passed
// explicitly.
#include <iostream>

int next_id() {
    static int value = 0;
    return ++value;
}

int main() {
    std::cout << next_id() << ' ' << next_id() << '\n';
}

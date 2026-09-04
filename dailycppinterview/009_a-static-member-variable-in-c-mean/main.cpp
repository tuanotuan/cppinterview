// Real-World C++ Interviews Q009: What does a static member variable in C++ mean?
// Key: A static data member belongs to the class rather than to each object, so one storage
// location is shared by all instances. Its definition and initialization rules depend on
// whether it is an inline static member and on the selected language standard.
#include <iostream>

int next_id() {
    static int value = 0;
    return ++value;
}

int main() {
    std::cout << next_id() << ' ' << next_id() << '\n';
}

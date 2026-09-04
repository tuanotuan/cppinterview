// Real-World C++ Interviews Q027: What is a destructor and how can we overload it?
// Key: A destructor ends an object's lifetime and releases resources owned by it. A class can
// have only one destructor, so destructors cannot be overloaded; it may be virtual, defaulted,
// deleted, or given an exception specification.
#include <iostream>

struct Resource {
    ~Resource() { std::cout << "released\n"; }
};

int main() {
    Resource resource;
}

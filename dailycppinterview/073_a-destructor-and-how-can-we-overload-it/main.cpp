// Real-World C++ Interviews Q073: What is a destructor and how can we overload it?
// Key: A destructor performs end-of-lifetime cleanup, and a class has exactly one destructor
// signature. It cannot be overloaded, although it can be virtual, defaulted, deleted, or
// constrained by accessibility.
#include <iostream>

struct Resource {
    ~Resource() { std::cout << "released\n"; }
};

int main() {
    Resource resource;
}

// Real-World C++ Interviews Q051: Explain the Resource acquisition is initialization (RAII)
// idiom
// Key: RAII binds a resource's lifetime to an object's lifetime: acquisition establishes an
// invariant, and the destructor releases the resource on every exit path. Stack unwinding
// therefore handles exceptions without separate cleanup code.
#include <iostream>

struct Resource {
    Resource() { std::cout << "acquire\n"; }
    ~Resource() { std::cout << "release\n"; }
};

int main() {
    Resource resource;
}

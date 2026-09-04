// Daily C++ Interview Q017: What is virtual inheritance in C++ and when should you use it?
// Key: Virtual inheritance makes all paths in a diamond share one base subobject. The
// most-derived constructor initializes that virtual base, which removes duplicate base state
// but complicates layout and construction.
#include <iostream>

struct Root { int value = 42; };
struct Left : virtual Root {};
struct Right : virtual Root {};
struct Leaf : Left, Right {};

int main() {
    Leaf leaf;
    leaf.Left::value = 7;
    std::cout << leaf.Right::value << '\n';
}

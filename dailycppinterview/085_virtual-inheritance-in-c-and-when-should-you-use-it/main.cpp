// Daily C++ Interview Q085: What is virtual inheritance in C++ and when should you use it?
// Key: Virtual inheritance represents one shared base subobject when a most-derived object
// reaches that base through multiple paths. The most-derived constructor is responsible for
// initializing it.
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

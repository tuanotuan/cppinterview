// Daily C++ Interview Q072: What does std::move move?
// Key: `std::move` is a cast to an xvalue, not a transfer operation. A subsequent constructor
// or assignment may move resources, and the source remains valid but its value may be
// unspecified.
#include <iostream>
#include <string>
#include <utility>

int main() {
    std::string source = "resource";
    std::string destination = std::move(source);
    std::cout << destination << '\n';
}

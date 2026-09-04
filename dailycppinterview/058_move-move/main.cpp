// Daily C++ Interview Q058: What does std::move move?
// Key: `std::move` moves nothing by itself; it casts its argument to an xvalue so overload
// resolution may select a move operation. The selected operation decides what is transferred,
// and the source remains valid but often has an unspecified value.
#include <iostream>
#include <string>
#include <utility>

int main() {
    std::string source = "resource";
    std::string destination = std::move(source);
    std::cout << destination << '\n';
}

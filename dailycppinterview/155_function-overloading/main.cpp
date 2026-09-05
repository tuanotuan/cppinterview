// Real-World C++ Interviews Q155: What is function overloading in C++ (compile-time
// polymorphism)?
// Key: Function overloading declares multiple functions with the same name in the same scope
// but different parameter lists or, for member functions, qualifying cv/ref details. Overload
// resolution selects the best viable candidate at compile time from the argument types and
// conversions. A return type alone cannot distinguish overloads, and conversions or default
// arguments can make a call ambiguous.
#include <iostream>
#include <string_view>

void print(int value) {
    std::cout << "integer: " << value << std::endl;
}

void print(std::string_view value) {
    std::cout << "text: " << value << std::endl;
}

int main() {
    print(42);
    print(std::string_view{"C++"});
}

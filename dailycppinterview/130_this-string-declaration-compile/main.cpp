// Daily C++ Interview Q130: Does this string declaration compile?
// Key: With `<string>` included, `std::string(foo);` is parsed as the declaration `std::string
// foo;`, so it creates an empty string rather than a discarded temporary. Do not rely on
// `<iostream>` transitively providing `<string>`; write the intended declaration clearly.
#include <iostream>
#include <string>

int main() {
    std::string(foo);
    std::cout << std::boolalpha << foo.empty() << '\n';
}

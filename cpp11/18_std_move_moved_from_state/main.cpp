#include <iostream>
#include <string>
#include <utility>

int main() {
    std::string source = "ticks";
    std::string target = std::move(source);

    // source is valid, but its value is unspecified.
    std::cout << "target=" << target << '\n';

    source = "reused"; // assigning a fresh value is safe
    std::cout << "source=" << source << '\n';
}

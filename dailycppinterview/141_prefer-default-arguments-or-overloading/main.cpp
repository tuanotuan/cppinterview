// Daily C++ Interview Q141: Should you prefer default arguments or overloading?
// Key: Neither form is universally preferable. Default arguments are concise when one operation
// truly has a stable default, but values are compiled into callers and interact badly with
// virtual dispatch; overloads support distinct contracts and can preserve binary compatibility
// at the cost of more API surface.
#include <iostream>

void render(int width, int height = 10) {
    std::cout << width << 'x' << height << '\n';
}

void render(const char* preset) {
    std::cout << preset << '\n';
}

int main() {
    render(20);
    render("compact");
}

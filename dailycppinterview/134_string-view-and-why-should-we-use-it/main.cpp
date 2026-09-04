// Real-World C++ Interviews Q134: What is std::string_view and why should we use it?
// Key: `std::string_view` is a cheap, non-owning view of a contiguous character sequence. It is
// useful for read-only parameters and slicing, but the underlying storage must outlive the view
// and data is not guaranteed null-terminated; it should not blindly replace every `const
// std::string&`.
#include <iostream>
#include <string>
#include <string_view>

void show(std::string_view value) {
    std::cout << value.substr(0, 5) << '\n';
}

int main() {
    const std::string owner = "hello view";
    show(owner);
}

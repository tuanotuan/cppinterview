// Real-World C++ Interviews Q030: What are immediately invoked lambda functions?
// Key: An immediately invoked lambda expression places the call `()` directly after the lambda,
// such as `auto value = [&] { return compute(); }();`. It creates a small local scope for
// complex one-time initialization without leaving a callable behind.
#include <iostream>

int main() {
    const auto value = [] {
        const int base = 40;
        return base + 2;
    }();
    std::cout << value << '\n';
}

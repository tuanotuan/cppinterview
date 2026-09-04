// Daily C++ Interview Q007: When to use decltype(auto)?
// Key: Use `decltype(auto)` when a deduced declaration or return type must preserve exactly
// what `decltype(expression)` yields, including references. It is powerful for forwarding
// accessors but can accidentally return a dangling reference.
#include <type_traits>

int value = 42;

decltype(auto) access() {
    return (value);
}

int main() {
    static_assert(std::is_same_v<decltype(access()), int&>);
}

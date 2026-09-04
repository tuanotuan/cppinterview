// Real-World C++ Interviews Q060: What is the difference between universal and rvalue
// references?
// Key: `T&&` is a forwarding reference only when `T` is cv-unqualified and deduced in that
// context (or for a corresponding `auto&&`). Otherwise it is an ordinary rvalue reference that
// binds to rvalues; the distinction controls reference collapsing and forwarding.
#include <iostream>
#include <type_traits>
#include <utility>

template<class T>
decltype(auto) identity(T&& value) {
    return std::forward<T>(value);
}

int main() {
    int value = 60;
    static_assert(std::is_lvalue_reference_v<decltype(identity(value))>);
    std::cout << identity(value) << '\n';
}

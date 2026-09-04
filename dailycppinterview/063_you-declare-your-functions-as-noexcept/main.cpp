// Real-World C++ Interviews Q063: When should you declare your functions as noexcept?
// Key: Declare a function `noexcept` when throwing would violate its contract, especially
// destructors, swap-like operations, and move operations that containers can safely prefer. If
// an exception escapes, the program terminates, so use conditional `noexcept` for generic code
// whose operations may throw.
#include <iostream>
#include <type_traits>
#include <utility>

template<class T>
decltype(auto) identity(T&& value) {
    return std::forward<T>(value);
}

int main() {
    int value = 63;
    static_assert(std::is_lvalue_reference_v<decltype(identity(value))>);
    std::cout << identity(value) << '\n';
}

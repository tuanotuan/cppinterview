// Daily C++ Interview Q138: What are the primary and mixed value categories in C++?
// Key: The primary value categories are lvalue, xvalue, and prvalue. Glvalue groups lvalue plus
// xvalue because both identify an object or function; rvalue groups prvalue plus xvalue because
// their resources can generally participate in move-oriented operations.
#include <type_traits>
#include <utility>

int main() {
    int value = 0;
    static_assert(std::is_lvalue_reference_v<decltype((value))>);
    static_assert(std::is_rvalue_reference_v<decltype(std::move(value))>);
    static_assert(!std::is_reference_v<decltype(42)>);
}

// Daily C++ Interview Q003: What are the advantages of using auto?
// Key: `auto` guarantees initialization, avoids repeating complex or implementation-specific
// types, and makes many refactors safer. Use it when the initializer makes intent clear; an
// explicit type is still better when conversion or domain meaning matters.
#include <type_traits>

int main() {
    const int source = 3;
    auto value = source;
    const auto& view = source;
    static_assert(std::is_same_v<decltype(value), int>);
    static_assert(std::is_same_v<decltype(view), const int&>);
}

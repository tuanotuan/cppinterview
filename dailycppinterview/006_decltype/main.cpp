// Real-World C++ Interviews Q006: Explain decltype!
// Key: `decltype` reports the declared type for an unparenthesized name, but for other
// expressions it also reflects value category: lvalue gives `T&`, xvalue gives `T&&`, and
// prvalue gives `T`. Extra parentheses can therefore change the result.
#include <type_traits>
#include <utility>

int main() {
    int value = 0;
    static_assert(std::is_same_v<decltype(value), int>);
    static_assert(std::is_same_v<decltype((value)), int&>);
    static_assert(std::is_same_v<decltype(std::move(value)), int&&>);
}

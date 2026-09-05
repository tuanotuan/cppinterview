// Real-World C++ Interviews Q157: What are the auto and decltype keywords used for?
// Key: `auto` asks the compiler to deduce a declared type from an initializer using rules
// largely modeled on template argument deduction; the written declarator still controls
// references and cv-qualification. `decltype(expr)` computes a type without evaluating the
// expression and preserves value-category information, with special rules for unparenthesized
// names. `decltype(auto)` applies those `decltype` rules to a deduced declaration or return
// type and can therefore preserve references that plain `auto` would drop.
#include <type_traits>
#include <utility>

int main() {
    const int source = 42;
    auto value = source;
    const auto& view = source;
    decltype(auto) exact = (view);

    static_assert(std::is_same_v<decltype(value), int>);
    static_assert(std::is_same_v<decltype(exact), const int&>);
}

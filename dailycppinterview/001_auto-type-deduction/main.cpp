// Daily C++ Interview Q001: Explain auto type deduction!
// Key: `auto` follows template-style deduction: top-level references and cv-qualifiers may be
// dropped according to the declaration form, while braced initializers have special
// `std::initializer_list` rules. Write `auto&`, `const auto&`, or `auto&&` when reference
// behavior is part of the contract.
#include <type_traits>

int main() {
    const int source = 1;
    auto value = source;
    const auto& view = source;
    static_assert(std::is_same_v<decltype(value), int>);
    static_assert(std::is_same_v<decltype(view), const int&>);
}

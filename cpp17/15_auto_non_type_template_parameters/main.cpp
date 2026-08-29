#include <iostream>
#include <type_traits>

template <auto Value>
struct Constant {
    inline static constexpr auto value = Value;
};

int main() {
    static_assert(std::is_same_v<
                  decltype(Constant<42>::value), const int>);
    static_assert(std::is_same_v<
                  decltype(Constant<'Z'>::value), const char>);

    std::cout << "integer: " << Constant<42>::value << '\n';
    std::cout << "character: " << Constant<'Z'>::value << '\n';
}

// Real-World C++ Interviews Q046: What advantages does alias have over typedef?
// Key: A `using` alias reads left-to-right and, unlike `typedef`, can define alias templates.
// Both name an existing type rather than create a new strong type.
#include <iostream>
#include <type_traits>

enum class Result { success, failure };

int main() {
    constexpr Result result = Result::success;
    static_assert(std::is_enum_v<Result>);
    std::cout << (result == Result::success) << '\n';
}

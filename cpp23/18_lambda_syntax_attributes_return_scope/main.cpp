#include <iostream>
#include <type_traits>

int main() {
#if defined(__cpp_lambda_attributes) && __cpp_lambda_attributes >= 202207L
    auto twice = [] [[nodiscard]] (int value) -> decltype(value) {
        return value * 2;
    };
#else
    auto twice = [](int value) -> decltype(value) {
        return value * 2;
    };
#endif

    static_assert(std::is_same_v<decltype(twice(1)), int>);
    std::cout << twice(6) << '\n';
}

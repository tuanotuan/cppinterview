// Real-World C++ Interviews Q176: What is SFINAE? How does it relate to template
// specialization?
// Key: SFINAE means Substitution Failure Is Not An Error: when substitution fails in the
// immediate context of a function-template candidate, that candidate is removed from overload
// resolution instead of making the program ill-formed. It can enable overloads or partial class
// specializations conditionally, but it is not itself explicit specialization, and function
// templates cannot be partially specialized. In C++20, constraints and concepts usually express
// the same intent more clearly and produce better diagnostics.
#include <iostream>
#include <type_traits>

template<class T, std::enable_if_t<std::is_integral_v<T>, int> = 0>
T twice(T value) {
    return value + value;
}

template<class T>
struct TypeName {
    static constexpr const char* value = "other";
};

template<>
struct TypeName<int> {
    static constexpr const char* value = "int";
};

int main() {
    std::cout << twice(21) << ' ' << TypeName<int>::value << std::endl;
}

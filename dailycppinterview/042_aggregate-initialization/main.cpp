// Real-World C++ Interviews Q042: What is aggregate initialization?
// Key: Aggregate initialization initializes an aggregate's elements directly from a braced
// list, in declaration order or with designated initializers where supported. Whether a class
// is an aggregate depends on standard-version rules about constructors, bases, virtual
// functions, and access.
#include <iostream>
#include <type_traits>

enum class Result { success, failure };

int main() {
    constexpr Result result = Result::success;
    static_assert(std::is_enum_v<Result>);
    std::cout << (result == Result::success) << '\n';
}

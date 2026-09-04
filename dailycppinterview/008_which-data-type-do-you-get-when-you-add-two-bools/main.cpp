// Daily C++ Interview Q008: Which data type do you get when you add two bools?
// Key: Both operands undergo integral promotion from `bool` to `int`, so adding two `bool`
// values produces an `int`. Its value is 0, 1, or 2.
#include <type_traits>

int main() {
    const auto sum = true + true;
    static_assert(std::is_same_v<decltype(sum), const int>);
    return sum == 2 ? 0 : 1;
}

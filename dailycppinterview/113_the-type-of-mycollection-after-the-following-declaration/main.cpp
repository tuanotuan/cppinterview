// Real-World C++ Interviews Q113: What is the type of myCollection after the following
// declaration?
// Key: The declaration deduces `std::initializer_list<int>` because copy-list initialization
// with `auto` uses the initializer-list deduction rule. The elements must agree on one deduced
// element type.
#include <initializer_list>
#include <type_traits>

int main() {
    auto myCollection = {1, 2, 3};
    static_assert(std::is_same_v<decltype(myCollection), std::initializer_list<int>>);
}

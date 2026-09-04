// Daily C++ Interview Q004: What is the type of myCollection after the following declaration?
// Key: `auto myCollection = {1, 2, 3};` deduces `std::initializer_list<int>`. All elements must
// support deduction of one common element type.
#include <initializer_list>
#include <type_traits>

int main() {
    auto myCollection = {1, 2, 3};
    static_assert(std::is_same_v<decltype(myCollection), std::initializer_list<int>>);
}

// Daily C++ Interview Q061: What is reference collapsing?
// Key: Reference collapsing reduces nested reference formation to one reference: any
// combination containing `&` becomes `&`, and only `&&` combined with `&&` remains `&&`. This
// is what lets forwarding references preserve the caller's value category.
#include <type_traits>

template<class T>
using Lvalue = T&;

int main() {
    static_assert(std::is_same_v<Lvalue<int&>, int&>);
    static_assert(std::is_same_v<int&&, int&&>);
}

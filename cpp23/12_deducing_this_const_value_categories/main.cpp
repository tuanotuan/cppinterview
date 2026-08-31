#include <iostream>
#include <type_traits>
#include <utility>

#if defined(__cpp_explicit_this_parameter)
struct Box {
    int value{7};

    template <class Self>
    decltype(auto) get(this Self&& self) {
        return (std::forward<Self>(self).value);
    }
};
#endif

int main() {
#if defined(__cpp_explicit_this_parameter)
    Box box;
    const Box fixed;
    static_assert(std::is_same_v<decltype(box.get()), int&>);
    static_assert(std::is_same_v<decltype(fixed.get()), const int&>);
    static_assert(std::is_same_v<decltype(std::move(box).get()), int&&>);
    std::cout << fixed.get() << '\n';
#else
    std::cout << "deducing this unavailable\n";
#endif
}

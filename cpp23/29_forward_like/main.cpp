#include <iostream>
#include <type_traits>
#include <utility>
#include <version>

struct Box {
    int value{7};
};

template <class Owner>
decltype(auto) project(Owner&& owner) {
#if defined(__cpp_lib_forward_like)
    return std::forward_like<Owner>(owner.value);
#else
    return (std::forward<Owner>(owner).value);
#endif
}

int main() {
    Box box;
    static_assert(std::is_same_v<decltype(project(box)), int&>);
    static_assert(std::is_same_v<decltype(project(std::move(box))), int&&>);
    std::cout << project(box) << '\n';
}

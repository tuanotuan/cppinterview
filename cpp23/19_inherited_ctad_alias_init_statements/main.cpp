#include <iostream>

#if defined(ENABLE_INHERITED_CTOR_CTAD)
template <class T>
struct Box {
    T value;
    Box(T input) : value(input) {}
};

template <class T>
struct Tagged : Box<T> {
    using Box<T>::Box;
};
#endif

int main() {
    if (using score_t = int; score_t{7} > 5)
        std::cout << "alias init-statement selected\n";

#if defined(ENABLE_INHERITED_CTOR_CTAD)
    Tagged item{42};
    std::cout << item.value << '\n';
#else
    std::cout << "inherited CTAD demo disabled\n";
#endif
}

#include <concepts>
#include <iostream>

#if defined(__cpp_explicit_this_parameter)
template <class T>
concept HasValue = requires(const T& object) {
    { object.value } -> std::convertible_to<int>;
};

struct Box {
    int value{42};

    template <class Self>
    int read(this const Self& self) requires HasValue<Self> {
        return self.value;
    }
};
#endif

int main() {
#if defined(__cpp_explicit_this_parameter)
    const Box box;
    std::cout << box.read() << '\n';
#else
    std::cout << "constrained deducing this unavailable\n";
#endif
}

// Day 18: constexpr Virtual Functions and explicit(bool)
#include <iostream>
#include <type_traits>

struct Base {
    virtual constexpr int value() const { return 1; }
};

struct Derived : Base {
    constexpr int value() const override { return 2; }
};

template<class T>
struct Box {
    int stored{};

    explicit(!std::is_convertible_v<T, int>)
    constexpr Box(T value) : stored(static_cast<int>(value)) {}
};

int main() {
    constexpr Derived object{};
    static_assert(object.value() == 2);

    Box<int> box = 7; // explicit(false): copy-initialization is allowed.
    std::cout << object.value() << ' ' << box.stored << '\n';
}

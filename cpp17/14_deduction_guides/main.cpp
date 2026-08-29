#include <iostream>
#include <string>
#include <type_traits>

template <class T>
struct Box {
    T value;
};

template <class T>
Box(T) -> Box<T>;

Box(const char*) -> Box<std::string>;

int main() {
    Box number{42};
    Box text{"C++17"};
    static_assert(std::is_same_v<decltype(text), Box<std::string>>);

    std::cout << "number: " << number.value << '\n';
    std::cout << "text: " << text.value << '\n';
}

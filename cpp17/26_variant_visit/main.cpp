#include <iostream>
#include <string>
#include <variant>

template <class... Ts>
struct Overloaded : Ts... {
    using Ts::operator()...;
};
template <class... Ts>
Overloaded(Ts...) -> Overloaded<Ts...>;

int main() {
    std::variant<int, std::string> value = 42;
    const auto print = Overloaded{
        [](int number) { std::cout << "integer: " << number << '\n'; },
        [](const std::string& text) {
            std::cout << "text: " << text << '\n';
        }};

    std::visit(print, value);
    value = std::string{"C++17"};
    std::visit(print, value);
}

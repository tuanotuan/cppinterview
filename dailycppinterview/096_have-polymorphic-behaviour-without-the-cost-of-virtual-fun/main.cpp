// Daily C++ Interview Q096: Is it possible to have polymorphic behaviour without the cost of
// virtual functions?
// Key: Yes. Templates, CRTP, concepts, and discriminated unions such as `std::variant` can
// provide static or closed-set polymorphism without virtual dispatch. The trade-offs include
// compile-time coupling, code size, and less runtime extensibility.
#include <iostream>
#include <variant>

struct Circle { double radius; };
struct Square { double side; };

int main() {
    std::variant<Circle, Square> shape = Square{2.0};
    const auto area = std::visit([](const auto& value) {
        if constexpr (requires { value.radius; }) return 3.14 * value.radius * value.radius;
        else return value.side * value.side;
    }, shape);
    std::cout << area << '\n';
}

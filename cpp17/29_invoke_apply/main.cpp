#include <functional>
#include <iostream>
#include <tuple>

struct Widget {
    int value;
    int scale(int factor) const { return value * factor; }
};

int add(int left, int right) {
    return left + right;
}

int main() {
    const Widget widget{7};
    std::cout << "scaled: "
              << std::invoke(&Widget::scale, widget, 3) << '\n';
    std::cout << "member: "
              << std::invoke(&Widget::value, widget) << '\n';

    const auto arguments = std::make_tuple(2, 5);
    std::cout << "applied: " << std::apply(add, arguments) << '\n';
}

// Real-World C++ Interviews Q175: What are lvalues and rvalues?
// Key: An lvalue is a glvalue that is not an xvalue and normally denotes an object whose
// identity persists; an xvalue is a glvalue whose resources may be reused. A prvalue computes a
// value or initializes an object, and the term rvalue covers prvalues and xvalues. These value
// categories affect overload resolution, reference binding, temporary materialization, and move
// semantics; they are more precise than saying only that lvalues appear on the left and rvalues
// on the right of assignment.
#include <iostream>
#include <utility>

void category(const int&) {
    std::cout << "lvalue" << std::endl;
}

void category(int&&) {
    std::cout << "rvalue" << std::endl;
}

int main() {
    int value = 42;
    category(value);
    category(std::move(value));
    category(7);
}

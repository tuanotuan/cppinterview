// Real-World C++ Interviews Q164: What is the this pointer, and how is it used?
// Key: Inside a non-static member function, `this` points to the object on which the function
// was invoked; its pointee is const in a const-qualified member function. It is commonly used
// to disambiguate members from parameters, pass the current object, or return `*this` for
// chaining. Static member functions have no `this`, and `delete this` is valid only under rare
// ownership contracts that are difficult to make safe and should normally be avoided.
#include <iostream>

class Widget {
public:
    Widget& set_value(int value) {
        this->value_ = value;
        return *this;
    }

    Widget& increment() {
        ++value_;
        return *this;
    }

    int value() const { return value_; }

private:
    int value_{};
};

int main() {
    Widget widget;
    std::cout << widget.set_value(4).increment().value() << std::endl;
}

// Real-World C++ Interviews Q097: How would you add functionality to your classes with the
// Curiously Recurring Template Pattern (CRTP)?
// Key: CRTP passes the derived type as a template argument to a base, allowing the base to call
// derived behavior with `static_cast<Derived&>(*this)`. It supplies compile-time mixins without
// virtual dispatch, but the relationship and lifetime assumptions must remain explicit.
#include <iostream>

template<class Derived>
struct Printable {
    void print() const {
        static_cast<const Derived&>(*this).print_impl();
    }
};

struct Answer : Printable<Answer> {
    void print_impl() const { std::cout << 42 << '\n'; }
};

int main() {
    Answer{}.print();
}

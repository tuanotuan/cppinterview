// Real-World C++ Interviews Q165: What is function overriding in C++, and how does the base
// class affect it?
// Key: A derived member overrides a virtual base member when its name, parameter list, cv/ref
// qualifiers, and return and exception rules form a valid overriding signature. Calls through a
// base reference or pointer then dispatch to the final overrider at runtime. Mark derived
// declarations `override` so the compiler catches mismatches; unrelated overloads with the same
// name can otherwise hide the base overload set, which may need an explicit `using Base::name`.
#include <iostream>

struct Base {
    virtual ~Base() = default;
    virtual int value() const { return 1; }
};

struct Derived final : Base {
    int value() const override { return 2; }
};

int main() {
    const Derived derived;
    const Base& base = derived;
    std::cout << base.value() << std::endl;
}

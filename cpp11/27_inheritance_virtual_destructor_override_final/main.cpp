#include <iostream>

class Base {
public:
    virtual ~Base() {
        std::cout << "Base destroyed\n";
    }

    virtual const char* name() const {
        return "Base";
    }
};

class Derived final : public Base {
public:
    ~Derived() override {
        std::cout << "Derived destroyed\n";
    }

    const char* name() const override {
        return "Derived";
    }
};

int main() {
    Base* object = new Derived;
    std::cout << object->name() << '\n';
    delete object; // safe because Base has a virtual destructor
}

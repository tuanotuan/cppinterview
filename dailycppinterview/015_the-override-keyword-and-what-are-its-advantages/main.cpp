// Daily C++ Interview Q015: What is the override keyword and what are its advantages?
// Key: `override` tells the compiler that a derived declaration must override a virtual base
// function. A signature mismatch then becomes a compile error instead of silently creating a
// different overload.
struct Base {
    virtual ~Base() = default;
    virtual int value() const { return 1; }
};

struct Derived : Base {
    int value() const override { return 2; }
};

int main() {
    Derived value;
    return value.value() == 2 ? 0 : 1;
}

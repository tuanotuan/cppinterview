// Real-World C++ Interviews Q081: What is the override keyword and what are its advantages?
// Key: `override` turns the intention to override into a checked compiler contract. It catches
// cv/ref qualifier, parameter, and other signature mismatches that would otherwise silently
// hide or overload a base function.
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

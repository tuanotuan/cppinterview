// Real-World C++ Interviews Q023: What role does a virtual destructor play?
// Key: A virtual base destructor ensures that deleting through a base pointer destroys the
// complete derived object. Without it, such deletion is undefined behavior; a non-polymorphic
// base can instead use a protected non-virtual destructor to forbid deletion through the base.
#include <memory>

struct Base {
    virtual ~Base() = default;
};

struct Derived : Base {
    ~Derived() override = default;
};

int main() {
    std::unique_ptr<Base> value = std::make_unique<Derived>();
}

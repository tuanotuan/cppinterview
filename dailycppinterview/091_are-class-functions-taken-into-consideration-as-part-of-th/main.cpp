// Daily C++ Interview Q091: Are class functions taken into consideration as part of the object
// size?
// Key: Non-static member function code is not stored separately in each object, so it does not
// directly add per-object size. Data members, padding, alignment, bases, and implementation
// machinery such as a virtual pointer determine object size.
#include <iostream>

struct Plain {
    int value;
    void operation() {}
};

struct Polymorphic {
    virtual ~Polymorphic() = default;
    int value;
};

int main() {
    std::cout << sizeof(Plain) << ' ' << sizeof(Polymorphic) << '\n';
}

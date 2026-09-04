// Real-World C++ Interviews Q095: What is an abstract class in C++?
// Key: An abstract class has at least one pure virtual function and cannot be instantiated
// directly. It can still own state, define constructors and concrete functions, and even
// provide a definition for a pure virtual function.
#include <memory>

struct Shape {
    virtual ~Shape() = default;
    virtual double area() const = 0;
};

struct Square : Shape {
    explicit Square(double side) : side(side) {}
    double area() const override { return side * side; }
    double side;
};

int main() {
    std::unique_ptr<Shape> shape = std::make_unique<Square>(2.0);
    return shape->area() == 4.0 ? 0 : 1;
}

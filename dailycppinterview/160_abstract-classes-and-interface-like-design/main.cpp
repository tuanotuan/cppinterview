// Real-World C++ Interviews Q160: What is the difference between an abstract class and an
// interface in C++? How do you implement interface-like behavior?
// Key: An abstract class has at least one pure virtual function and may also own state,
// constructors, non-virtual functions, and implemented virtual functions. C++ has no
// `interface` keyword; an interface-like runtime contract is normally an abstract class
// containing only the required pure virtual operations plus a virtual destructor when deletion
// through the base is supported. C++20 concepts provide a separate compile-time contract for
// generic code without inheritance or runtime dispatch.
#include <iostream>
#include <memory>

struct Shape {
    virtual ~Shape() = default;
    virtual double area() const = 0;
};

class Square final : public Shape {
public:
    explicit Square(double side) : side_(side) {}
    double area() const override { return side_ * side_; }

private:
    double side_{};
};

int main() {
    const std::unique_ptr<Shape> shape = std::make_unique<Square>(3.0);
    std::cout << shape->area() << std::endl;
}

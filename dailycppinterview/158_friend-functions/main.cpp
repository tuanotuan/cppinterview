// Real-World C++ Interviews Q158: What is a friend function?
// Key: A friend function is not a member function, but a `friend` declaration grants it access
// to a class's private and protected members. Friendship is explicit, neither inherited nor
// transitive, and does not grant friendship in the reverse direction. It is useful for tightly
// coupled non-member operations such as symmetric operators, but broad friendship increases
// coupling and should not replace a well-designed public interface.
#include <iostream>

class Box {
public:
    Box(double width, double height) : width_(width), height_(height) {}
    friend double area(const Box& box);

private:
    double width_{};
    double height_{};
};

double area(const Box& box) {
    return box.width_ * box.height_;
}

int main() {
    std::cout << area(Box{3.0, 4.0}) << std::endl;
}

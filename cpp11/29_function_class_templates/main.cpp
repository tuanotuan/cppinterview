#include <iostream>

template <typename T>
T bigger(T left, T right) {
    return left < right ? right : left;
}

template <typename T>
class Box {
public:
    explicit Box(T value) : value_(value) {}
    T get() const { return value_; }
private:
    T value_;
};

int main() {
    Box<int> count(7);
    Box<double> price(2.5);

    std::cout << "bigger=" << bigger(3, 9) << '\n';
    std::cout << "boxes=" << count.get() << ',' << price.get() << '\n';
}

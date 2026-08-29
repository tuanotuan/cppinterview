#include <iostream>
#include <string>
#include <utility>

template <class T>
const T& max_value(const T& left, const T& right) {
    return left < right ? right : left;
}

template <class T>
class Box {
public:
    explicit Box(T value) : value_(std::move(value)) {}
    const T& get() const { return value_; }
private:
    T value_;
};

int main() {
    Box<std::string> label("C++14");
    std::cout << "max: " << max_value(3, 7) << "\n";
    std::cout << "box: " << label.get() << "\n";
}

#include <iostream>

class Box {
public:
    explicit Box(int value) : value_(value) {}

    Box(const Box& other) : value_(other.value_) {
        std::cout << "copied\n";
    }

    void set(int value) {
        value_ = value;
    }

    int get() const {
        return value_;
    }

private:
    int value_;
};

int main() {
    Box original(7);
    Box copy(original);
    copy.set(9);
    std::cout << "original=" << original.get() << " copy=" << copy.get() << '\n';
}

#include <iostream>
#include <utility>

class IntOwner {
public:
    explicit IntOwner(int value) : data_(new int(value)) {}
    ~IntOwner() { delete data_; }

    IntOwner(IntOwner&& other) : data_(other.data_) {
        other.data_ = nullptr;
        std::cout << "move-constructed\n";
    }

    IntOwner& operator=(IntOwner&& other) {
        if (this != &other) {
            delete data_;
            data_ = other.data_;
            other.data_ = nullptr;
        }
        std::cout << "move-assigned\n";
        return *this;
    }

    int get() const { return data_ ? *data_ : -1; }

private:
    IntOwner(const IntOwner&);
    IntOwner& operator=(const IntOwner&);
    int* data_;
};

int main() {
    IntOwner first(7);
    IntOwner second(std::move(first));
    IntOwner third(1);
    third = std::move(second);
    std::cout << "first=" << first.get() << " third=" << third.get() << '\n';
}

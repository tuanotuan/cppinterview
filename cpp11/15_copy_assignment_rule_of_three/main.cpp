#include <iostream>

class IntOwner {
public:
    explicit IntOwner(int value) : data_(new int(value)) {}

    ~IntOwner() {
        delete data_;
    }

    IntOwner(const IntOwner& other) : data_(new int(*other.data_)) {}

    IntOwner& operator=(const IntOwner& other) {
        if (this != &other) {
            int* replacement = new int(*other.data_);
            delete data_;
            data_ = replacement;
        }
        return *this;
    }

    void set(int value) { *data_ = value; }
    int get() const { return *data_; }

private:
    int* data_;
};

int main() {
    IntOwner first(3);
    IntOwner second(first);
    IntOwner third(0);
    third = first;
    second.set(8);
    std::cout << first.get() << ',' << second.get() << ',' << third.get() << '\n';
}

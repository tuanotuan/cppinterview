// Real-World C++ Interviews Q153: Explain shallow copy, deep copy, and the copy constructor in
// C++.
// Key: A copy constructor initializes a new object from an existing object. An implicitly
// generated copy performs memberwise copy: value members become independent values, while a raw
// pointer member copies only its address, which can look like a shallow copy and can break
// ownership. A deep-copying owner allocates a distinct resource and copies its contents, but
// the preferred design is the Rule of Zero—store resources in value-semantic RAII members so
// generated copy and destruction already have the right behavior.
#include <iostream>
#include <memory>

class Number {
public:
    explicit Number(int value) : value_(std::make_unique<int>(value)) {}

    Number(const Number& other)
        : value_(std::make_unique<int>(*other.value_)) {}

    Number& operator=(const Number& other) {
        if (this != &other) value_ = std::make_unique<int>(*other.value_);
        return *this;
    }

    int value() const { return *value_; }
    void set(int value) { *value_ = value; }

private:
    std::unique_ptr<int> value_;
};

int main() {
    Number first{10};
    Number second = first;
    second.set(20);
    std::cout << first.value() << ' ' << second.value() << std::endl;
}

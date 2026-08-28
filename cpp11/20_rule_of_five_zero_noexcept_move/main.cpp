#include <iostream>
#include <string>
#include <utility>

class Owner {
public:
    explicit Owner(int value = 0) : data_(new int(value)) {}
    ~Owner() { delete data_; }
    Owner(const Owner& other) : data_(new int(*other.data_)) {}
    Owner& operator=(const Owner& other) {
        if (this != &other) {
            *data_ = *other.data_;
        }
        return *this;
    }
    Owner(Owner&& other) noexcept : data_(other.data_) {
        other.data_ = nullptr;
    }
    Owner& operator=(Owner&& other) noexcept {
        if (this != &other) {
            delete data_;
            data_ = other.data_;
            other.data_ = nullptr;
        }
        return *this;
    }
    int get() const { return data_ ? *data_ : -1; }
private:
    int* data_;
};

struct RuleOfZero {
    std::string label; // string manages its own resource
};

int main() {
    Owner first(5);
    Owner second(std::move(first));
    RuleOfZero zero{"automatic"};
    std::cout << second.get() << ' ' << zero.label << '\n';
}

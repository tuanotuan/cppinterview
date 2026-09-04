// Daily C++ Interview Q070: Explain the rule of five
// Key: In C++11 and later, a resource-owning class that defines special members may need all
// five: destructor, copy constructor, copy assignment, move constructor, and move assignment.
// Each should be implemented or deleted consistently.
#include <memory>
#include <utility>

class Owner {
public:
    Owner() : value_(std::make_unique<int>(42)) {}
    ~Owner() = default;
    Owner(const Owner& other) : value_(std::make_unique<int>(*other.value_)) {}
    Owner& operator=(const Owner& other) {
        if (this != &other) value_ = std::make_unique<int>(*other.value_);
        return *this;
    }
    Owner(Owner&&) noexcept = default;
    Owner& operator=(Owner&&) noexcept = default;

private:
    std::unique_ptr<int> value_;
};

int main() {
    Owner first;
    Owner second = std::move(first);
}

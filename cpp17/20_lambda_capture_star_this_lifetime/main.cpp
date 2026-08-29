#include <functional>
#include <iostream>

class Counter {
public:
    explicit Counter(int value) : value_(value) {}

    auto snapshot() const {
        return [*this] { return value_; };
    }

    void set(int value) { value_ = value; }

private:
    int value_;
};

std::function<int()> make_callback() {
    Counter counter{10};
    auto callback = counter.snapshot();
    counter.set(99);
    return callback;
}

int main() {
    const auto callback = make_callback();
    std::cout << "snapshot: " << callback() << '\n';
}

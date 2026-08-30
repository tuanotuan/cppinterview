// Day 24: likely, unlikely, and Explicit this Capture
#include <iostream>

class Counter {
    int value_{};

public:
    explicit Counter(int value) : value_{value} {}

    auto reader() {
        return [this] {
            if (value_ >= 0) [[likely]] {
                return value_;
            } else [[unlikely]] {
                return 0;
            }
        };
    }
};

int main() {
    Counter counter{8};
    auto read = counter.reader();
    std::cout << "value = " << read() << '\n';
}

// Daily C++ Interview Q087: What does a strong type mean and what advantages does it have?
// Key: A strong type creates a distinct semantic type around a representation, preventing
// accidental interchange of values such as meters and seconds. It can enforce invariants and
// make overloads and interfaces clearer.
#include <iostream>

class Score {
public:
    explicit Score(int value) : value_(value) {}
    int value() const { return value_; }

private:
    int value_;
};

int main() {
    const Score score{87};
    std::cout << score.value() << '\n';
}

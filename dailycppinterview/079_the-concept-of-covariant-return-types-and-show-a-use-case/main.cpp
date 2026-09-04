// Daily C++ Interview Q079: Explain the concept of covariant return types and show a use-case
// where it comes in handy!
// Key: Covariant returns allow an override to narrow a returned class pointer or reference to a
// derived type. The rule applies only to compatible pointer/reference class returns, not
// arbitrary values or smart pointers.
#include <iostream>

class Score {
public:
    explicit Score(int value) : value_(value) {}
    int value() const { return value_; }

private:
    int value_;
};

int main() {
    const Score score{79};
    std::cout << score.value() << '\n';
}

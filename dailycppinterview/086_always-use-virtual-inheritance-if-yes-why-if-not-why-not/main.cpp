// Daily C++ Interview Q086: Should we always use virtual inheritance? If yes, why? If not, why
// not?
// Key: Do not use virtual inheritance by default. Reserve it for designs that require one
// shared base identity across a diamond and accept the extra layout, initialization, and
// coupling costs.
#include <iostream>

class Score {
public:
    explicit Score(int value) : value_(value) {}
    int value() const { return value_; }

private:
    int value_;
};

int main() {
    const Score score{86};
    std::cout << score.value() << '\n';
}

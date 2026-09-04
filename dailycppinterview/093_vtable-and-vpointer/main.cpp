// Real-World C++ Interviews Q093: What are vtable and vpointer?
// Key: A vtable is a common implementation table of virtual-function targets, and a vpointer is
// a hidden per-object pointer used to reach it. The standard specifies virtual-call behavior,
// not that every implementation must use exactly this layout.
#include <iostream>

class Score {
public:
    explicit Score(int value) : value_(value) {}
    int value() const { return value_; }

private:
    int value_;
};

int main() {
    const Score score{93};
    std::cout << score.value() << '\n';
}

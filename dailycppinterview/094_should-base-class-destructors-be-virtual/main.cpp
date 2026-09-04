// Daily C++ Interview Q094: Should base class destructors be virtual?
// Key: A base destructor should be public and virtual when objects may be deleted through base
// pointers. If deletion through the base is forbidden, a protected non-virtual destructor is a
// valid alternative; adding virtual solely by habit imposes polymorphic layout.
#include <iostream>

class Score {
public:
    explicit Score(int value) : value_(value) {}
    int value() const { return value_; }

private:
    int value_;
};

int main() {
    const Score score{94};
    std::cout << score.value() << '\n';
}

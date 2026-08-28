#include <iostream>

class Seconds {
public:
    explicit Seconds(int value) : value_(value) {}
    int value() const { return value_; }
private:
    int value_;
};

class Score {
public:
    Score(int value) : value_(value) {} // intentional conversion
    int value() const { return value_; }
private:
    int value_;
};

void show_seconds(Seconds value) {
    std::cout << "seconds=" << value.value() << '\n';
}

void show_score(Score value) {
    std::cout << "score=" << value.value() << '\n';
}

int main() {
    show_seconds(Seconds(5)); // show_seconds(5) is rejected
    show_score(9);            // implicit conversion is allowed
}

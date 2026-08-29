#include <iostream>

class Token {
public:
    explicit Token(int value) : value_(value) {
        std::cout << "construct " << value_ << '\n';
    }
    Token(const Token&) = delete;
    Token(Token&&) = delete;

    int value() const { return value_; }

private:
    int value_;
};

Token make_token() {
    return Token{42};
}

int main() {
    Token token = make_token();
    std::cout << "value: " << token.value() << '\n';
}

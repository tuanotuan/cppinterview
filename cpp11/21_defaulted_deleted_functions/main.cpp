#include <iostream>

class Token {
public:
    Token() = default;
    Token(const Token&) = delete;
    Token& operator=(const Token&) = delete;

    void use() const {
        std::cout << "token-used\n";
    }
};

int main() {
    Token token; // compiler-generated default constructor
    token.use();

    // Token copy(token); // error: copy constructor is deleted
}

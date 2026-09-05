// Real-World C++ Interviews Q169: What is the difference between std::exception and
// user-defined exceptions?
// Key: `std::exception` is the polymorphic base of the standard exception hierarchy and exposes
// the virtual `what()` diagnostic. A user-defined exception represents domain-specific failure
// and should normally derive from an appropriate standard type such as `std::runtime_error` or
// `std::logic_error`, optionally carrying structured context. Catching by `const
// std::exception&` gives a generic boundary while earlier handlers can still match the domain
// type precisely.
#include <iostream>
#include <stdexcept>
#include <string>

class ParseError final : public std::runtime_error {
public:
    ParseError(int line, const std::string& message)
        : std::runtime_error(message), line_(line) {}

    int line() const { return line_; }

private:
    int line_{};
};

int main() {
    try {
        throw ParseError{7, "invalid token"};
    } catch (const ParseError& error) {
        std::cout << "line " << error.line() << ": " << error.what() << std::endl;
    }
}
